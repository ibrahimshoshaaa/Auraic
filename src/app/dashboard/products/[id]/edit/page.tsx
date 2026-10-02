import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { activeProductStatus } from "@/lib/active-product";
import { db } from "@/lib/db";
import { ProductEditor } from "@/components/products/ProductEditor";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!can(session.role, "products.write") || !can(session.role, "recipes.write")) throw new Error("Forbidden");
  const { id } = await params;
  const [product, materials] = await Promise.all([
    db.product.findFirst({ where: { id, storeId: session.storeId, ...activeProductStatus }, include: { variants: { where: { active: true }, include: { recipes: { where: { active: true }, include: { versions: { where: { isCurrent: true }, include: { items: true } } } } } } } }),
    db.material.findMany({ where: { storeId: session.storeId, active: true }, include: { materialType: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><Link href={`/dashboard/products/${id}`} className="text-sm text-[#514b8c]">← تفاصيل المنتج</Link><h1 className="text-3xl font-bold">تعديل {product.title}</h1><ProductEditor materials={materials.map(m => ({ id: m.id, name: m.name, unit: m.unit, category: m.materialType.name }))} initial={{ id, title: product.title, description: product.storefrontDescription, category: product.storefrontCategory, images: product.storefrontImages, published: product.storefrontPublished, featured: product.storefrontFeatured, variants: product.variants.map(v => ({ id: v.id, clientId: randomUUID(), title: v.title, price: Number(v.price), compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null, materials: v.recipes[0]?.versions[0]?.items.map(m => ({ materialId: m.materialId, quantity: Number(m.quantity) })) || [{ materialId: "", quantity: "" }] })) }} /></main>;
}
