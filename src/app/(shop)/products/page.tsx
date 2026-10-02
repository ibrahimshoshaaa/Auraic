import { hasOffer, matchesAudience } from "@/lib/storefront/collections";
import { Catalog } from "@/components/storefront/Catalog";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Fragrances | Auraic" };
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; audience?: string; collection?: string }> }) {
  const shop = await getPublicShop(); if (!shop) return null;
  const { category, q, audience, collection } = await searchParams;
  const all = await getPublicProducts(shop.id);
  const validAudience = ["men", "women", "unisex"].includes(audience || "") ? audience : undefined;
  const filtered = all.filter(p => (!category || p.category === category) && (!validAudience || matchesAudience(p.category, validAudience)) && (collection !== "offers" || hasOffer(p)) && (collection !== "bestsellers" || p.featured));
  const heading = validAudience === "men" ? "For Men" : validAudience === "women" ? "For Women" : validAudience === "unisex" ? "Unisex" : collection === "offers" ? "Offers" : collection === "bestsellers" ? "Best Sellers" : category || "The Auraic collection";
  return <main className="shop-section"><header className="shop-page-heading"><p className="shop-eyebrow">OUR FRAGRANCES</p><h1>{heading}</h1><p>A fragrance for every feeling. Find the one that feels like you.</p></header><Catalog initialSearch={q || ""} products={filtered} /></main>;
}
