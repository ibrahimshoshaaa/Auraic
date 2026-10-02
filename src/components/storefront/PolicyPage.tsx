import Link from "next/link";
import type { ShopSettings } from "@/lib/storefront/config";
import { formatMoney } from "@/lib/storefront/pricing";

export function PolicyPage({ kind, settings }: { kind: "shipping" | "returns"; settings: ShopSettings }) {
  const shipping = kind === "shipping";
  const policy = (shipping ? settings.shippingPolicy : settings.returnPolicy).trim();
  return <main className="shop-policy-page">
    <nav className="shop-policy-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>{shipping ? "Shipping & delivery" : "Returns & exchanges"}</span></nav>
    <header className="shop-policy-heading"><p className="shop-eyebrow">{shipping ? "DELIVERED TO YOUR DOOR" : "HERE TO HELP"}</p><h1>{shipping ? <>Shipping &<br/>delivery</> : <>Returns &<br/>exchanges</>}</h1><p>{shipping ? "Your Auraic order, from our store to your door." : "Need help with your order? Review our policy and get in touch."}</p></header>
    {shipping && <section className="shop-delivery-facts" aria-label="Delivery information"><article><span>01 · SHIPPING</span><h2>{settings.shippingFee === 0 ? "Free shipping" : formatMoney(settings.shippingFee)}</h2><p>Delivery fee for your order.</p></article>{settings.freeShippingFrom > 0 && <article><span>02 · FREE DELIVERY</span><h2>From {formatMoney(settings.freeShippingFrom)}</h2><p>Free shipping when your fragrance subtotal reaches this amount.</p></article>}<article><span>{settings.freeShippingFrom > 0 ? "03" : "02"} · PAYMENT</span><h2>Cash on delivery</h2><p>Shipping and your final total are shown at checkout before you confirm.</p></article></section>}
    <div className="shop-policy-layout"><section className="shop-policy-copy"><p className="shop-eyebrow">THE DETAILS</p><h2>{shipping ? "Delivery information" : "Our returns policy"}</h2>{policy ? <div className="shop-policy-text">{policy}</div> : <p className="shop-policy-text">{shipping ? "Delivery fees are shown above. Contact us if you need more information about delivery to your address." : "Please contact us to confirm the return or exchange conditions for your order."}</p>}</section>
      <aside className="shop-policy-help"><p className="shop-eyebrow">LET’S TALK</p><h2>Questions about<br/>your order?</h2><p>{shipping ? "Ask us about delivery to your address." : "Share your order number and tell us how we can help."}</p><Link className="shop-button" href="/contact">CONTACT AURAIC <span>⟶</span></Link><Link className="shop-policy-other" href={shipping ? "/returns" : "/shipping"}>{shipping ? "Returns & exchanges" : "Shipping & delivery"} →</Link></aside></div>
    <footer className="shop-policy-explore"><span>FIND YOUR NEXT FRAGRANCE</span><Link href="/products">Explore the collection <span>⟶</span></Link></footer>
  </main>;
}
