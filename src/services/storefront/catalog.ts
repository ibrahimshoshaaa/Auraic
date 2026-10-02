import { db } from "@/lib/db";
import { activeProductStatus } from "@/lib/active-product";
import { defaultShopSettings, shopSettingsSchema } from "@/lib/storefront/config";

export async function getShopSettings(storeId: string) {
  const setting = await db.setting.findUnique({ where: { storeId_key: { storeId, key: "storefront" } } });
  if (!setting) return defaultShopSettings;
  try { return shopSettingsSchema.parse(JSON.parse(setting.value)); }
  catch { return defaultShopSettings; }
}
export async function getPublicShop() {
  const id = process.env.STOREFRONT_STORE_ID;
  if (!id) return null;
  const store = await db.store.findFirst({ where: { id, status: "ACTIVE" }, select: { id: true, currency: true } });
  if (!store || store.currency !== "EGP") return null;
  const settings = await getShopSettings(store.id);
  return { ...store, settings };
}
export async function getPublicProducts(storeId: string) {
  const products = await db.product.findMany({
    where: { storeId, storefrontPublished: true, ...activeProductStatus },
    select: { id: true, title: true, storefrontDescription: true, storefrontCategory: true,
      storefrontImages: true, storefrontFeatured: true,
      variants: { where: { active: true, price: { gt: 0 }, recipes: { some: { active: true, versions: { some: { isCurrent: true, items: { some: {} } } } } } },
        select: { id: true, title: true, price: true, compareAtPrice: true }, orderBy: { price: "asc" } } },
    orderBy: [{ storefrontFeatured: "desc" }, { createdAt: "desc" }],
  });
  return products.filter(product => product.variants.length).map(product => ({
    id: product.id, name: product.title, description: product.storefrontDescription,
    category: product.storefrontCategory, images: product.storefrontImages, featured: product.storefrontFeatured,
    variants: product.variants.map(variant => ({ ...variant, price: Number(variant.price), compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null })),
  }));
}
export type ShopProduct = Awaited<ReturnType<typeof getPublicProducts>>[number];
