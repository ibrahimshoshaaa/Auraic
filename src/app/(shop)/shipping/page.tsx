import { getPublicShop } from "@/services/storefront/catalog";
import { PolicyPage } from "@/components/storefront/PolicyPage";
export const metadata = { title: "Shipping & delivery | Auraic" };
export default async function ShippingPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <PolicyPage kind="shipping" settings={shop.settings}/>;
}
