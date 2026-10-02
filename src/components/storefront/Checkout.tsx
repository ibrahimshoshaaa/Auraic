"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { useCart } from "./CartProvider";
import type { ShopProduct } from "@/services/storefront/catalog";
import type { ShopSettings } from "@/lib/storefront/config";
import { governorates } from "@/lib/storefront/config";
import { checkoutTotals, formatMoney } from "@/lib/storefront/pricing";

export function Checkout({ products, settings, checkout = false }: { products: ShopProduct[]; settings: ShopSettings; checkout?: boolean }) {
  const { lines, ready, update, clear, note } = useCart();
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [result, setResult] = useState<{ orderNumber: string; total: number } | null>(null);
  const requestId = useRef<string | null>(null);
  const catalog = new Map(products.flatMap(product => product.variants.map(variant => [variant.id, { ...variant, product }] as const)));
  const missing = lines.some(line => !catalog.has(line.variantId));
  const totals = checkoutTotals(lines.map(line => ({ quantity: line.quantity, price: catalog.get(line.variantId)?.price || 0 })), settings.shippingFee, settings.freeShippingFrom);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError(""); setBusy(true);
    const data = new FormData(event.currentTarget); requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/storefront/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        note, requestId: requestId.current, expectedTotalCents: totals.totalCents, name: data.get("name"), phone: data.get("phone"), governorate: data.get("governorate"), address: data.get("address"),
        items: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })),
      }) });
      const body = await response.json(); if (!response.ok) throw new Error(response.status === 409 ? "Your bag or its prices have changed. Review your bag before continuing." : response.status === 422 ? "Please check your delivery details and try again." : "Unable to place your order. Please try again.");
      setResult(body.data); clear(); requestId.current = null;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "We could not place your order. Please try again."); }
    finally { setBusy(false); }
  }
  if (result) return <section className="shop-success" role="status"><span>✓</span><p className="shop-eyebrow">THANK YOU</p><h1>Your order is confirmed</h1><p>Order number <strong dir="ltr">{result.orderNumber}</strong></p><p>Total due on delivery: <strong>{formatMoney(result.total)}</strong></p><p>We will contact you to confirm your order details.</p><Link className="shop-button" href="/products">Keep exploring</Link></section>;
  if (!ready) return <p className="shop-empty" role="status">Loading your bag…</p>;
  if (!lines.length) return <section className="shop-empty"><h1>Your bag is waiting</h1><p>Discover your next fragrance in the Auraic collection.</p><Link href="/products" className="shop-button">Shop fragrances →</Link></section>;
  const summary = <aside className="shop-order-summary"><h2>Order summary</h2><small>{lines.reduce((sum, line) => sum + line.quantity, 0)} items in your bag</small><p><span>Fragrances</span><strong>{formatMoney(totals.subtotalCents / 100)}</strong></p><p><span>Shipping</span><strong>{totals.shippingCents ? formatMoney(totals.shippingCents / 100) : "Free"}</strong></p><p className="shop-total"><span>Total</span><strong>{formatMoney(totals.totalCents / 100)}</strong></p>{settings.freeShippingFrom > 0 && totals.shippingCents > 0 && <small>Add {formatMoney(Math.max(0, settings.freeShippingFrom - totals.subtotalCents / 100))} to unlock free shipping</small>}<p className="shop-payment-label">Cash on delivery</p>{!checkout && <Link aria-disabled={missing || !settings.enabled} className={`shop-button ${missing || !settings.enabled ? "disabled" : ""}`} href={missing || !settings.enabled ? "/cart" : "/checkout"}>Checkout →</Link>}</aside>;
  return <div className="shop-checkout-grid"><div>{missing && <p role="alert" className="shop-error">A fragrance is no longer available. Remove it to continue.</p>}{!settings.enabled && <p className="shop-error">Orders are currently paused.</p>}
    {!checkout ? <div className="shop-cart-items">{lines.map(line => { const found = catalog.get(line.variantId); return <article key={line.variantId} className="shop-cart-item"><Image src={found?.product.images[0] || "/auraic-bottle.svg"} width={110} height={140} alt={line.name} unoptimized /><div><Link href={`/products/${line.productId}`}><h2>{found?.product.name || line.name}</h2></Link><p>{found?.title || line.size}</p><strong>{found ? formatMoney(found.price) : "Unavailable"}</strong><p className="shop-line-total">Line total: {found ? formatMoney(found.price * line.quantity) : "Unavailable"}</p><div className="shop-quantity"><button aria-label={`Decrease quantity of ${line.name}`} disabled={line.quantity <= 1} onClick={() => update(line.variantId, line.quantity - 1)}>−</button><span>{line.quantity}</span><button aria-label={`Increase quantity of ${line.name}`} disabled={line.quantity >= 20} onClick={() => update(line.variantId, line.quantity + 1)}>+</button></div></div><button className="shop-remove" onClick={() => update(line.variantId, 0)} aria-label={`Remove ${line.name}`}>×</button></article>; })}</div>
    : <form onSubmit={submit} className="shop-checkout-form"><nav className="shop-checkout-steps"><Link href="/cart">1. Bag</Link><b>2. Delivery</b><span>3. Confirmation</span></nav><h2>Delivery details</h2><p>Enter your details. We will confirm your order before shipping.</p><fieldset disabled={busy}><label>Full name<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Recipient name" /></label><label>Mobile number<input name="phone" type="tel" inputMode="tel" required pattern="01[0125][0-9]{8}" autoComplete="tel-national" placeholder="01xxxxxxxxx" dir="ltr" /></label><label>Governorate<select name="governorate" required defaultValue=""><option value="" disabled>Choose governorate</option>{governorates.map((name, index) => <option key={name} value={name}>{["Cairo", "Giza", "Alexandria", "Qalyubia", "Menofia", "Gharbia", "Dakahlia", "Sharqia", "Beheira", "Kafr El Sheikh", "Damietta", "Port Said", "Ismailia", "Suez", "Fayoum", "Beni Suef", "Minya", "Assiut", "Sohag", "Qena", "Luxor", "Aswan", "Matrouh", "Red Sea", "New Valley", "North Sinai", "South Sinai"][index]}</option>)}</select></label><label>Delivery address<textarea name="address" required minLength={10} maxLength={400} rows={3} autoComplete="street-address" placeholder="Area, street, building, apartment and a nearby landmark" /></label></fieldset><h3>Review your fragrances</h3><div className="shop-checkout-lines">{lines.map(line => <p key={line.variantId}>{catalog.get(line.variantId)?.product.name || line.name} · {line.size} <b>× {line.quantity} · {formatMoney((catalog.get(line.variantId)?.price || 0) * line.quantity)}</b></p>)}</div><p className="shop-consent">By confirming, you agree to our <Link href="/shipping">shipping policy</Link> and <Link href="/returns">returns policy</Link>.</p>{error && <p className="shop-error" role="alert">{error}</p>}<button disabled={busy || missing || !settings.enabled} className="shop-button">{busy ? "◌ Placing your order…" : "Confirm order · Pay on delivery"}</button><Link className="shop-inline-link" href="/cart">Edit bag</Link></form>}
  </div>{summary}</div>;
}
