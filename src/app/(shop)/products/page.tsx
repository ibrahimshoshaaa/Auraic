import { Catalog } from "@/components/storefront/Catalog";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "مجموعة العطور | Auraic" };
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const shop = await getPublicShop(); if (!shop) return null;
  const { category, q } = await searchParams;
  const all = await getPublicProducts(shop.id);
  return <main className="shop-section"><header className="shop-page-heading"><p className="shop-eyebrow">OUR FRAGRANCES</p><h1>{category || "مجموعة Auraic"}</h1><p>عطور لكل إحساس. اكتشف الأقرب ليك.</p></header><Catalog initialSearch={q || ""} products={category ? all.filter(product => product.category === category) : all} /></main>;
}
