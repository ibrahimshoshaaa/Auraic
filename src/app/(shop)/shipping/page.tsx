import { getPublicShop } from "@/services/storefront/catalog";
import { formatMoney } from "@/lib/storefront/pricing";
export default async function ShippingPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section shop-policy"><p className="shop-eyebrow">DELIVERY</p><h1>الشحن والتوصيل</h1><p>{shop.settings.shippingPolicy || "تفاصيل سياسة الشحن هتتوفر قبل بدء استقبال الطلبات."}</p><p>رسوم الشحن: {formatMoney(shop.settings.shippingFee)}</p>{shop.settings.freeShippingFrom > 0 && <p>الشحن مجاني للطلبات من {formatMoney(shop.settings.freeShippingFrom)}.</p>}<p>الدفع عند الاستلام. تكلفة الشحن والإجمالي بتظهر قبل تأكيد الطلب.</p></main>;
}
