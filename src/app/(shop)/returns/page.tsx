import { getPublicShop } from "@/services/storefront/catalog";
export default async function ReturnsPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section shop-policy"><p className="shop-eyebrow">RETURNS</p><h1>الاستبدال والإرجاع</h1><p>{shop.settings.returnPolicy || "سياسة الاستبدال والإرجاع هتتوفر قبل بدء استقبال الطلبات."}</p></main>;
}
