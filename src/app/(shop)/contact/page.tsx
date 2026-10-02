import { getPublicShop } from "@/services/storefront/catalog";
export default async function ContactPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <main className="shop-section shop-policy"><p className="shop-eyebrow">LET’S TALK</p><h1>We would love to hear from you</h1><p>Questions about a fragrance or an order? Get in touch with Auraic.</p>{shop.settings.whatsapp && <a className="shop-button" href={`https://wa.me/${shop.settings.whatsapp}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp ↗</a>}{shop.settings.contactEmail && <p><a href={`mailto:${shop.settings.contactEmail}`}>{shop.settings.contactEmail}</a></p>}{!shop.settings.whatsapp && !shop.settings.contactEmail && <p>Our contact details will be available soon.</p>}</main>;
}
