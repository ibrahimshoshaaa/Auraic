import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicShop } from "@/services/storefront/catalog";
import { ShopIcon } from "@/components/storefront/ShopIcon";
export const metadata = { title: "Contact | Auraic" };
export default async function ContactPage() {
  const shop = await getPublicShop();
  if (!shop) notFound();
  const { settings } = shop;
  return <main className="shop-policy-page shop-contact-page">
    <nav className="shop-policy-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Contact</span></nav>
    <header className="shop-policy-heading"><p className="shop-eyebrow">LET’S TALK</p><h1>A little help.<br/>A personal touch.</h1><p>Choosing a fragrance or checking on an order? We’re here to help.</p></header>
    <div className="shop-contact-grid"><section className="shop-contact-methods"><p className="shop-eyebrow">GET IN TOUCH</p><h2>Contact Auraic</h2>{settings.whatsapp && <a className="shop-contact-method" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer"><ShopIcon name="whatsapp"/><div><h3>WhatsApp</h3><p>Ask about a fragrance, delivery or your order.</p><strong>Start a conversation ↗</strong></div></a>}{settings.contactEmail && <a className="shop-contact-method" href={`mailto:${settings.contactEmail}`}><span aria-hidden="true">✉</span><div><h3>Email us</h3><p>Include your order number if you have one.</p><strong>{settings.contactEmail}</strong></div></a>}{!settings.whatsapp && !settings.contactEmail && <p className="shop-policy-text">Our contact channels are being updated. Please check back for our latest contact details.</p>}</section><aside className="shop-policy-help"><p className="shop-eyebrow">HELP WITH YOUR ORDER</p><h2>Useful information</h2><p>Find delivery details and return conditions before placing your order.</p><Link className="shop-contact-policy" href="/shipping">Shipping & delivery <span>→</span></Link><Link className="shop-contact-policy" href="/returns">Returns & exchanges <span>→</span></Link></aside></div>
    <footer className="shop-policy-explore"><span>FIND YOUR NEXT FRAGRANCE</span><Link href="/products">Explore the collection <span>⟶</span></Link></footer>
  </main>;
}
