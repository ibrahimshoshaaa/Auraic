import { getPublicShop } from "@/services/storefront/catalog";
import { PolicyPage } from "@/components/storefront/PolicyPage";
export const metadata = { title: "Returns & exchanges | Auraic" };
export default async function ReturnsPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <PolicyPage kind="returns" settings={shop.settings}/>;
}
