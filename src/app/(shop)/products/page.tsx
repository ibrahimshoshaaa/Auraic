import { Catalog } from "@/components/storefront/Catalog";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Fragrances | Auraic" };
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; audience?: string; collection?: string }> }) {
  const shop = await getPublicShop(); if (!shop) return null;
  const { category, q, audience, collection } = await searchParams;
  const all = await getPublicProducts(shop.id);
  const validAudience = ["men", "women", "unisex"].includes(audience || "") ? audience : undefined;
  return <main className="shop-section shop-collection-page"><Catalog key={`${audience || ""}-${collection || ""}-${q || ""}-${category || ""}`} initialSearch={q || ""} initialAudience={validAudience || ""} initialCollection={["offers", "bestsellers"].includes(collection || "") ? collection : ""} products={category ? all.filter(p => p.category === category) : all} /></main>;
}
