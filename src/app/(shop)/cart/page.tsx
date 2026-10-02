import { Bag } from "@/components/storefront/Bag";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Shopping bag | Auraic", robots: { index: false, follow: false } };
export default async function CartPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-bag-page"><Bag products={await getPublicProducts(shop.id)} settings={shop.settings}/></main>;
}
