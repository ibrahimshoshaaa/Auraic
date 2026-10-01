import { Checkout } from "@/components/storefront/Checkout";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "حقيبة التسوق | Auraic", robots: { index: false, follow: false } };
export default async function CartPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section"><header className="shop-page-heading"><p className="shop-eyebrow">YOUR BAG</p><h1>حقيبة التسوق</h1></header><Checkout products={await getPublicProducts(shop.id)} settings={shop.settings} /></main>;
}
