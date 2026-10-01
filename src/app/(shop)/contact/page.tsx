import { getPublicShop } from "@/services/storefront/catalog";
export default async function ContactPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section shop-policy"><p className="shop-eyebrow">LET’S TALK</p><h1>يسعدنا نسمع منك</h1><p>عندك سؤال عن عطر أو طلب؟ تواصل مع فريق Auraic.</p>{shop.settings.whatsapp && <a className="shop-button" href={`https://wa.me/${shop.settings.whatsapp}`} target="_blank" rel="noopener noreferrer">تواصل على واتساب ↗</a>}{shop.settings.contactEmail && <p><a href={`mailto:${shop.settings.contactEmail}`}>{shop.settings.contactEmail}</a></p>}{!shop.settings.whatsapp && !shop.settings.contactEmail && <p>وسائل التواصل هتتوفر قريبًا.</p>}</main>;
}
