import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const productEditorSchema = z.object({
  requestId: z.string().uuid(), productId: z.string().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000), category: z.string().trim().min(1).max(80),
  images: z.array(z.string().url().max(2000).refine(url => url.startsWith("https://"))).max(8),
  published: z.boolean(), featured: z.boolean(),
  variants: z.array(z.object({
    id: z.string().optional(), clientId: z.string().uuid(), title: z.string().trim().min(1).max(100),
    price: z.number().finite().positive().max(1000000),
    compareAtPrice: z.number().finite().positive().max(1000000).nullable(),
    materials: z.array(z.object({ materialId: z.string().min(1), quantity: z.number().finite().min(0.000001).max(10000000) })).min(1).max(30),
  }).refine(v => v.compareAtPrice === null || v.compareAtPrice > v.price, "السعر قبل الخصم لازم يكون أكبر من سعر البيع")).min(1).max(20),
}).superRefine((input, ctx) => {
  if (new Set(input.variants.map(v => v.title.toLowerCase())).size !== input.variants.length) ctx.addIssue({ code: "custom", message: "اسم كل حجم لازم يكون مختلف", path: ["variants"] });
  for (const [index, variant] of input.variants.entries()) {
    if (new Set(variant.materials.map(m => m.materialId)).size !== variant.materials.length) ctx.addIssue({ code: "custom", message: "اختار كل خامة مرة واحدة في الحجم", path: ["variants", index, "materials"] });
  }
  if (new Set(input.variants.map(v => v.id || v.clientId)).size !== input.variants.length) ctx.addIssue({ code: "custom", message: "حجم مكرر", path: ["variants"] });
});

export async function saveManagedProduct(storeId: string, userId: string, input: z.infer<typeof productEditorSchema>) {
  return db.$transaction(async tx => {
    const productId = input.productId || `managed_${input.requestId}`;
    const existing = await tx.product.findUnique({ where: { id: productId }, include: { variants: true } });
    if (existing && existing.storeId !== storeId || input.productId && (!existing || existing.status === "ARCHIVED")) throw new Error("المنتج غير موجود");
    if (!input.productId && existing) return { productId };
    const ids = [...new Set(input.variants.flatMap(v => v.materials.map(m => m.materialId)))];
    const materials = await tx.material.findMany({ where: { id: { in: ids }, storeId, active: true }, select: { id: true, unit: true } });
    if (materials.length !== ids.length) throw new Error("خامة غير متاحة في مخزونك");
    const oldIds = new Set(existing?.variants.map(v => v.id));
    if (input.variants.some(v => v.id && !oldIds.has(v.id))) throw new Error("الحجم غير موجود في المنتج");
    const data = { title: input.title, storefrontDescription: input.description, storefrontCategory: input.category,
      storefrontImages: input.images, storefrontPublished: input.published, storefrontFeatured: input.featured };
    if (existing) await tx.product.update({ where: { id: productId }, data });
    else await tx.product.create({ data: { ...data, id: productId, storeId, status: "ACTIVE" } });
    const keptIds: string[] = [];
    for (const v of input.variants) {
      const variantId = v.id || `size_${v.clientId}`;
      const prices = { price: new Prisma.Decimal(v.price).toDecimalPlaces(2), compareAtPrice: v.compareAtPrice === null ? null : new Prisma.Decimal(v.compareAtPrice).toDecimalPlaces(2) };
      if (prices.compareAtPrice && prices.compareAtPrice.lte(prices.price)) throw new Error("راجع السعر قبل وبعد الخصم");
      if (v.id || oldIds.has(variantId)) await tx.productVariant.update({ where: { id: variantId }, data: { title: v.title, ...prices, active: true } });
      else await tx.productVariant.create({ data: { id: variantId, storeId, productId, title: v.title, ...prices } });
      keptIds.push(variantId);
      let recipe = await tx.recipe.findFirst({ where: { variantId, storeId }, include: { versions: { orderBy: { version: "desc" }, include: { items: true } } } });
      if (!recipe) recipe = await tx.recipe.create({ data: { variantId, storeId, name: `${input.title} · ${v.title}` }, include: { versions: { include: { items: true } } } });
      const current = recipe.versions.find(version => version.isCurrent);
      const changed = !current || current.items.length !== v.materials.length || v.materials.some(item => !current.items.some(old => old.materialId === item.materialId && Number(old.quantity) === item.quantity));
      await tx.recipe.update({ where: { id: recipe.id }, data: { active: true, name: `${input.title} · ${v.title}` } });
      if (changed) {
        await tx.recipeVersion.updateMany({ where: { recipeId: recipe.id, isCurrent: true }, data: { isCurrent: false } });
        await tx.recipeVersion.create({ data: { storeId, recipeId: recipe.id, version: (recipe.versions[0]?.version ?? 0) + 1, isCurrent: true,
          items: { create: v.materials.map(item => ({ ...item, unit: materials.find(m => m.id === item.materialId)!.unit })) } } });
      }
    }
    await tx.productVariant.updateMany({ where: { productId, storeId, id: { notIn: keptIds } }, data: { active: false } });
    await tx.auditLog.create({ data: { storeId, userId, action: existing ? "UPDATE" : "CREATE", entity: "Product", entityId: productId, metadata: { variants: keptIds } } });
    return { productId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
