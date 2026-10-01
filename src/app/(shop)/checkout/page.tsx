import { Checkout } from "@/components/storefront/Checkout";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "إتمام الطلب | Auraic", robots: { index: false, follow: false } };
export default async function CheckoutPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section"><header className="shop-page-heading"><p className="shop-eyebrow">ONE STEP CLOSER</p><h1>إتمام الطلب</h1></header><Checkout checkout products={await getPublicProducts(shop.id)} settings={shop.settings} /></main>;
}
