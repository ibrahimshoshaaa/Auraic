import { getPublicShop } from "@/services/storefront/catalog";
import { formatMoney } from "@/lib/storefront/pricing";
export default async function ShippingPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section shop-policy"><p className="shop-eyebrow">DELIVERY</p><h1>Shipping & delivery</h1><p>{shop.settings.shippingPolicy || "Shipping information will be available before we start accepting orders."}</p><p>Shipping fee: {formatMoney(shop.settings.shippingFee)}</p>{shop.settings.freeShippingFrom > 0 && <p>Free shipping on orders over {formatMoney(shop.settings.freeShippingFrom)}.</p>}<p>Pay on delivery. Shipping and your total are shown before confirmation.</p></main>;
}
