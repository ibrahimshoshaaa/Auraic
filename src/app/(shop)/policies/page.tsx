import Link from "next/link";
export const metadata = { title: "Policies | Auraic" };
export default function PoliciesPage() {
  return <main className="shop-policy-page"><nav className="shop-policy-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Policies</span></nav><header className="shop-policy-heading"><p className="shop-eyebrow">SHOP WITH CONFIDENCE</p><h1>Our policies</h1><p>Everything you need to know about delivery, returns and exchanges.</p></header><div className="shop-policy-index"><Link href="/shipping"><span>01 · DELIVERY</span><h2>Shipping & delivery</h2><p>Shipping fees, payment and delivery information.</p><b>READ POLICY →</b></Link><Link href="/returns"><span>02 · AFTER YOUR ORDER</span><h2>Returns & exchanges</h2><p>Review our policy and find help with your order.</p><b>READ POLICY →</b></Link></div><footer className="shop-policy-explore"><span>NEED A HAND?</span><Link href="/contact">Contact Auraic →</Link></footer></main>;
}
