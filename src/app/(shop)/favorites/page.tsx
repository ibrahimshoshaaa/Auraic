import { Favorites } from "@/components/storefront/Favorites";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Wishlist | Auraic", robots: { index: false, follow: false } };
export default async function FavoritesPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section"><header className="shop-page-heading"><p className="shop-eyebrow">YOUR FAVORITES</p><h1>Your wishlist</h1></header><Favorites products={await getPublicProducts(shop.id)} /></main>;
}
