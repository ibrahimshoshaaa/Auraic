import { getPublicShop } from "@/services/storefront/catalog";
export default async function ReturnsPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section shop-policy"><p className="shop-eyebrow">RETURNS</p><h1>Returns & exchanges</h1><p>{shop.settings.returnPolicy || "Our returns policy will be available before we start accepting orders."}</p></main>;
}
