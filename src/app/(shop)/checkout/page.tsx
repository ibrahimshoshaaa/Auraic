import { Checkout } from "@/components/storefront/Checkout";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Checkout | Auraic", robots: { index: false, follow: false } };
export default async function CheckoutPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section shop-checkout-page"><header className="shop-page-heading shop-checkout-title"><p className="shop-eyebrow">COMPLETE YOUR AURAIC EXPERIENCE</p><h1>Checkout</h1></header><Checkout checkout products={await getPublicProducts(shop.id, "all")} settings={shop.settings} /></main>;
}
