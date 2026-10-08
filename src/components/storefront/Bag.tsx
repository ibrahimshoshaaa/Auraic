"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import type { ShopProduct } from "@/services/storefront/catalog";
import type { ShopSettings } from "@/lib/storefront/config";
import { checkoutTotals, formatMoney } from "@/lib/storefront/pricing";
import { ShopIcon } from "./ShopIcon";

export function Bag({ products, settings, drawer = false }: { products: ShopProduct[]; settings: ShopSettings; drawer?: boolean }) {
  const { lines, ready, update, closeBag, note, setNote } = useCart();
  const catalog = new Map(products.flatMap(product => product.variants.map(variant => [variant.id, { ...variant, product }] as const)));
  const missing = lines.some(line => !catalog.has(line.variantId));
  const totals = checkoutTotals(lines.map(line => ({ quantity: line.quantity, price: catalog.get(line.variantId)?.price || 0 })), settings.shippingFee, settings.freeShippingFrom);
  const subtotal = totals.subtotalCents / 100;
  const progress = settings.freeShippingFrom > 0 ? Math.min(100, Math.round(subtotal / settings.freeShippingFrom * 100)) : 0;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <div className={`shop-bag-content ${ready && !lines.length ? "shop-bag-is-empty" : ""}`}><header className="shop-bag-heading"><div><p>YOUR SHOPPING BAG</p><h1>Your bag</h1></div><span>{count} {count === 1 ? "ITEM" : "ITEMS"}</span>{drawer && <button type="button" autoFocus onClick={closeBag} aria-label="Close shopping bag"><ShopIcon name="close"/></button>}</header>
    {settings.freeShippingFrom > 0 && <section className="shop-bag-shipping"><p>{subtotal >= settings.freeShippingFrom ? "You unlocked free shipping." : <>Add <strong>{formatMoney(settings.freeShippingFrom - subtotal)}</strong> to unlock free shipping.</>}<span>{progress}%</span></p><div role="progressbar" aria-label="Free shipping progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div></section>}
    <div className="shop-bag-items">{!ready ? <p role="status">Loading your bag…</p> : !lines.length ? <div className="shop-bag-empty"><div className="shop-bag-empty-icon" aria-hidden="true"><ShopIcon name="bag"/></div><h2>Your bag is waiting</h2><p>Discover your next Auraic fragrance.</p><Link href="/products" onClick={closeBag}>Explore fragrances <span aria-hidden="true">→</span></Link></div> : <>{missing && <p role="alert" className="shop-error">Remove unavailable fragrances before checkout.</p>}{lines.map(line => { const found = catalog.get(line.variantId); return <article className="shop-bag-item" key={line.variantId}><Link href={`/products/${line.productId}`} onClick={closeBag} className="shop-bag-photo"><Image src={found?.product.images[0] || line.image || "/auraic-bottle.svg"} width={100} height={125} alt={found?.product.name || line.name} unoptimized/></Link><div className="shop-bag-item-copy"><Link href={`/products/${line.productId}`} onClick={closeBag}><h2>{found?.product.name || line.name}</h2></Link><p>{/^\d+(?:\.\d+)?$/.test((found?.title || line.size).trim()) ? `${found?.title || line.size} ml` : found?.title || line.size}</p>{found?.product.inspiredBy && <p className="shop-bag-inspired"><span>INSPIRED BY</span><strong>{found.product.inspiredBy}</strong></p>}<div className="shop-bag-quantity"><button type="button" disabled={line.quantity <= 1} aria-label={`Decrease quantity of ${line.name}`} onClick={() => update(line.variantId, line.quantity - 1)}>−</button><span>{line.quantity}</span><button type="button" disabled={line.quantity >= 20} aria-label={`Increase quantity of ${line.name}`} onClick={() => update(line.variantId, line.quantity + 1)}>+</button></div></div><strong className="shop-bag-line-price">{found ? formatMoney(found.price * line.quantity) : "Unavailable"}</strong><button type="button" className="shop-bag-remove" aria-label={`Remove ${line.name}`} onClick={() => update(line.variantId, 0)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg></button></article>; })}</>}</div>
    <footer className="shop-bag-summary"><details className="shop-bag-note"><summary>ADD AN ORDER NOTE <span>+</span></summary><label><span className="sr-only">Order note</span><textarea maxLength={500} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything we should know about your order?"/></label></details><p><strong>Subtotal</strong><strong>{formatMoney(subtotal)}</strong></p><small>Shipping and payment options are confirmed at checkout.</small>{!settings.enabled && <p role="status">Orders are currently paused.</p>}{!lines.length || missing || !settings.enabled ? <span className="shop-bag-checkout disabled" aria-disabled="true"><span>CHECKOUT SECURELY</span><strong>{formatMoney(subtotal)}</strong></span> : <Link onClick={closeBag} href="/checkout" className="shop-bag-checkout"><span>CHECKOUT SECURELY</span><strong>{formatMoney(subtotal)}</strong></Link>}{drawer && <Link className="shop-bag-full" href="/cart" onClick={closeBag}>VIEW FULL BAG</Link>}</footer>
  </div>;
}
export function BagDrawer({ products, settings }: { products: ShopProduct[]; settings: ShopSettings }) {
  const { bagOpen, closeBag } = useCart(); const path = usePathname(); const panel = useRef<HTMLElement>(null);
  useEffect(() => { closeBag(); }, [path, closeBag]);
  useEffect(() => {
    if (!bagOpen) return;
    const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeBag(); if (e.key === "Tab") { const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href]:not([aria-disabled="true"]),button:not(:disabled),textarea') || []); const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); (document.querySelector<HTMLButtonElement>('.shop-header-actions button[aria-label^="Shopping bag"]') || previous)?.focus(); };
  }, [bagOpen, closeBag]);
  if (!bagOpen) return null;
  return <div className="shop-bag-layer"><button className="shop-bag-backdrop" type="button" onClick={closeBag} aria-label="Close bag overlay" tabIndex={-1}/><section ref={panel} role="dialog" aria-modal="true" aria-label="Shopping bag" className="shop-bag-panel"><Bag products={products} settings={settings} drawer/></section></div>;
}
