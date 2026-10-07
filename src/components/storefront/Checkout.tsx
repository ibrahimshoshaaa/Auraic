"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCart } from "./CartProvider";
import type { ShopProduct } from "@/services/storefront/catalog";
import type { ShopSettings } from "@/lib/storefront/config";
import { governorates, shippingFeeFor } from "@/lib/storefront/config";
import { checkoutTotals, formatMoney } from "@/lib/storefront/pricing";

export function Checkout({ products, settings, checkout = false }: { products: ShopProduct[]; settings: ShopSettings; checkout?: boolean }) {
  const { lines, ready, update, clear, note, setNote } = useCart();
  const [governorate, setGovernorate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "INSTAPAY" | "WALLET">("COD");
  const [paymentPlan, setPaymentPlan] = useState<"FULL" | "DEPOSIT">("FULL");
  const [transferReference, setTransferReference] = useState("");
  const [paymentOptions, setPaymentOptions] = useState<{ instapay: boolean; wallet: boolean; address: string; number: string; depositPercent: number } | null>(null);
  useEffect(() => { if (!checkout) return; void fetch("/api/storefront/payment-options").then(r => { if (!r.ok) throw new Error("Payment settings unavailable"); return r.json(); }).then(setPaymentOptions).catch(() => setPaymentOptions(null)); }, [checkout]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  useEffect(() => { setSummaryOpen(window.matchMedia("(min-width: 761px)").matches); }, []);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [result, setResult] = useState<{ orderNumber: string; total: number } | null>(null);
  const [coupon, setCoupon] = useState(""); const [couponBusy, setCouponBusy] = useState(false); const [couponError, setCouponError] = useState("");
  const [quote, setQuote] = useState<{ signature: string; code: string; subtotalCents: number; shippingCents: number; discountCents: number; totalCents: number; freeShipping: boolean } | null>(null);
  const signature = JSON.stringify({ items: lines.map(l => ({ variantId: l.variantId, quantity: l.quantity })), governorate, prices: products.flatMap(p => p.variants.map(v => [v.id, v.price])) });
  const activeQuote = quote?.signature === signature ? quote : null;
  const requestId = useRef<string | null>(null);
  const appliedCode = quote?.code;
  const quotedSignature = quote?.signature;
  useEffect(() => {
    if (!appliedCode || quotedSignature === signature) return;
    const controller = new AbortController();
    const { items, governorate: delivery } = JSON.parse(signature);
    setCouponBusy(true); setCouponError(""); setError(""); requestId.current = null;
    void (async () => {
      try {
        const response = await fetch("/api/storefront/coupons", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: appliedCode, governorate: delivery, items }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to update your discount.");
        if (!controller.signal.aborted) setQuote({ ...body.data, signature });
      } catch (failure) {
        if (!controller.signal.aborted) { setQuote(null); setCouponError(failure instanceof Error ? failure.message : "Unable to update your discount."); }
      } finally { if (!controller.signal.aborted) setCouponBusy(false); }
    })();
    return () => controller.abort();
  }, [appliedCode, quotedSignature, signature]);
  const catalog = new Map(products.flatMap(product => product.variants.map(variant => [variant.id, { ...variant, product }] as const)));
  const missing = lines.some(line => !catalog.has(line.variantId));
  const baseTotals = checkoutTotals(lines.map(line => ({ quantity: line.quantity, price: catalog.get(line.variantId)?.price || 0 })), shippingFeeFor(settings, governorate), settings.freeShippingFrom);
  const totals = activeQuote || quote || { ...baseTotals, discountCents: 0 };
  const awaitingShipping = !activeQuote?.freeShipping && !governorate && !(settings.freeShippingFrom > 0 && totals.subtotalCents >= settings.freeShippingFrom * 100);
  const displayedTotal = formatMoney((awaitingShipping ? totals.subtotalCents - totals.discountCents : totals.totalCents) / 100);
  async function applyCoupon() {
    if (couponBusy || busy) return; setCouponBusy(true); setCouponError(""); setQuote(null); requestId.current = null;
    try { const response = await fetch("/api/storefront/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: coupon, governorate, items: lines.map(l => ({ variantId: l.variantId, quantity: l.quantity })) }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setQuote({ ...body.data, signature }); }
    catch (failure) { setCouponError(failure instanceof Error ? failure.message : "Unable to apply coupon."); } finally { setCouponBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || couponBusy) return;
    if (coupon.trim() && !activeQuote) { setError("Wait for your discount to update, or apply a valid code before confirming."); return; }
    setError(""); setBusy(true);
    const data = new FormData(event.currentTarget); requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/storefront/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        couponCode: activeQuote?.code || "", note, paymentMethod, paymentPlan, transferReference, requestId: requestId.current, expectedTotalCents: totals.totalCents, name: data.get("name"), phone: data.get("phone"), governorate: data.get("governorate"), address: data.get("address"),
        items: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })),
      }) });
      const body = await response.json(); if (!response.ok) throw new Error(response.status === 409 ? body.error || "Your bag or its prices have changed. Review your bag before continuing." : response.status === 422 ? "Please check your delivery details and try again." : "Unable to place your order. Please try again.");
      setResult(body.data); clear(); requestId.current = null;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "We could not place your order. Please try again."); }
    finally { setBusy(false); }
  }
  if (result) return <section className="shop-success" role="status"><span>✓</span><p className="shop-eyebrow">THANK YOU</p><h1>Your order is confirmed</h1><p>Order number <strong dir="ltr">{result.orderNumber}</strong></p><p>Order total: <strong>{formatMoney(result.total)}</strong></p><p>{paymentMethod === "COD" ? "Pay on delivery." : "Your transfer is awaiting manual verification. Do not consider it paid until confirmed."}</p><p>We will contact you to confirm your order details.</p><Link className="shop-button" href="/products">Keep exploring</Link></section>;
  if (!ready) return <p className="shop-empty" role="status">Loading your bag…</p>;
  if (!lines.length) return <section className="shop-empty"><h1>Your bag is waiting</h1><p>Discover your next fragrance in the Auraic collection.</p><Link href="/products" className="shop-button">Shop fragrances →</Link></section>;
  const summary = <aside className="shop-order-summary shop-checkout-summary"><header><p className="shop-eyebrow">YOUR ORDER</p><h2>Order summary</h2><Link href="/cart">Edit bag →</Link></header><details className="shop-checkout-products" open={summaryOpen} onToggle={event => setSummaryOpen(event.currentTarget.open)}><summary>Fragrances in your bag</summary>{lines.map(line => { const found = catalog.get(line.variantId); return <article key={line.variantId}><div className="shop-checkout-product-photo"><Image src={found?.product.images[0] || line.image || "/auraic-bottle.svg"} alt={found?.product.name || line.name} width={60} height={75} unoptimized/><span>{line.quantity}</span></div><div><h3>{found?.product.name || line.name}</h3><p>{found?.title || line.size}</p></div><strong>{found ? formatMoney(found.price * line.quantity) : "Unavailable"}</strong></article>; })}</details><small>{lines.reduce((sum, line) => sum + line.quantity, 0)} items in your bag</small><p><span>Fragrances</span><strong>{formatMoney(totals.subtotalCents / 100)}</strong></p>{checkout && <section className="shop-coupon"><label htmlFor="coupon-code">Discount code</label><div><input id="coupon-code" value={coupon} maxLength={40} onChange={e => { setCoupon(e.target.value.toUpperCase()); setQuote(null); setCouponError(""); requestId.current = null; }} disabled={busy || couponBusy} placeholder="Enter code" autoComplete="off" /><button type="button" onClick={applyCoupon} disabled={!coupon.trim() || busy || couponBusy || missing}>{couponBusy ? "Applying…" : "Apply"}</button></div>{quote && <p role="status">{quote.code} applied{!activeQuote ? " · Updating total…" : ""} <button type="button" disabled={busy} onClick={() => { setQuote(null); setCoupon(""); requestId.current = null; }}>Remove</button></p>}{coupon.trim() && !activeQuote && !couponBusy && <small role="status">Apply your discount code before confirming.</small>}{couponError && <p role="alert" className="shop-error">{couponError}</p>}</section>}{totals.discountCents > 0 && <p><span>Discount{activeQuote ? ` · ${activeQuote.code}` : ""}</span><strong>−{formatMoney(totals.discountCents / 100)}</strong></p>}<p><span>Shipping</span><strong>{awaitingShipping ? "Choose governorate" : totals.shippingCents ? formatMoney(totals.shippingCents / 100) : "Free"}</strong></p><p className="shop-total"><span>{awaitingShipping ? "Subtotal · shipping pending" : "Total"}</span><strong>{displayedTotal}</strong></p>{settings.freeShippingFrom > 0 && totals.shippingCents > 0 && <small>Add {formatMoney(Math.max(0, settings.freeShippingFrom - totals.subtotalCents / 100))} to unlock free shipping</small>}<p className="shop-payment-label">{paymentMethod === "COD" ? "Cash on delivery" : paymentMethod === "INSTAPAY" ? "InstaPay · pending verification" : "Mobile wallet · pending verification"}</p>{!checkout && <Link aria-disabled={missing || !settings.enabled} className={`shop-button ${missing || !settings.enabled ? "disabled" : ""}`} href={missing || !settings.enabled ? "/cart" : "/checkout"}>Checkout →</Link>}</aside>;
  return <div className={`shop-checkout-grid ${checkout ? "shop-checkout-redesign" : ""}`}><div>{missing && <p role="alert" className="shop-error">A fragrance is no longer available. Remove it to continue.</p>}{!settings.enabled && <p className="shop-error">Orders are currently paused.</p>}
    {!checkout ? <div className="shop-cart-items">{lines.map(line => { const found = catalog.get(line.variantId); return <article key={line.variantId} className="shop-cart-item"><Image src={found?.product.images[0] || "/auraic-bottle.svg"} width={110} height={140} alt={line.name} unoptimized /><div><Link href={`/products/${line.productId}`}><h2>{found?.product.name || line.name}</h2></Link><p>{found?.title || line.size}</p><strong>{found ? formatMoney(found.price) : "Unavailable"}</strong><p className="shop-line-total">Line total: {found ? formatMoney(found.price * line.quantity) : "Unavailable"}</p><div className="shop-quantity"><button aria-label={`Decrease quantity of ${line.name}`} disabled={line.quantity <= 1} onClick={() => update(line.variantId, line.quantity - 1)}>−</button><span>{line.quantity}</span><button aria-label={`Increase quantity of ${line.name}`} disabled={line.quantity >= 20} onClick={() => update(line.variantId, line.quantity + 1)}>+</button></div></div><button className="shop-remove" onClick={() => update(line.variantId, 0)} aria-label={`Remove ${line.name}`}>×</button></article>; })}</div>
    : <form onSubmit={submit} className="shop-checkout-form" id="auraic-checkout-form" aria-busy={busy}><nav className="shop-checkout-steps" aria-label="Checkout steps"><Link href="/cart"><span>1</span> Bag</Link><b aria-current="step"><span>2</span> Delivery</b><span><span>3</span> Confirmation</span></nav><header className="shop-delivery-heading"><p className="shop-eyebrow">WHERE SHOULD WE DELIVER?</p><h2>Delivery details</h2><p>Enter your details and we’ll contact you to confirm your order.</p></header><fieldset disabled={busy} className="shop-delivery-fields"><legend className="sr-only">Delivery contact and address</legend><label>Full name<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Recipient name" /></label><label>Mobile number<input name="phone" type="tel" inputMode="tel" required pattern="01[0125][0-9]{8}" autoComplete="tel-national" placeholder="01xxxxxxxxx" dir="ltr" /></label><label>Governorate<select aria-label="Governorate" name="governorate" required value={governorate} onChange={event => { setGovernorate(event.target.value); requestId.current = null; }}><option value="" disabled>Choose governorate</option>{governorates.map((name, index) => <option key={name} value={name}>{["Cairo", "Giza", "Alexandria", "Qalyubia", "Menofia", "Gharbia", "Dakahlia", "Sharqia", "Beheira", "Kafr El Sheikh", "Damietta", "Port Said", "Ismailia", "Suez", "Fayoum", "Beni Suef", "Minya", "Assiut", "Sohag", "Qena", "Luxor", "Aswan", "Matrouh", "Red Sea", "New Valley", "North Sinai", "South Sinai"][index]}</option>)}</select></label><label className="shop-address-field">Delivery address<textarea name="address" required minLength={10} maxLength={400} rows={3} autoComplete="street-address" placeholder="Area, street, building, apartment and a nearby landmark" /></label><label className="shop-address-field">Order note <small>Optional</small><textarea name="note" rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything we should know about your order?" /></label></fieldset><section className="shop-cod-payment" style={{display:"block"}}>
      <h3>Payment method</h3>
      <label><input type="radio" name="paymentMethod" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")}/> Cash on delivery</label>
      {paymentOptions?.instapay && <label style={{display:"block",marginTop:12}}><input type="radio" name="paymentMethod" checked={paymentMethod === "INSTAPAY"} onChange={() => setPaymentMethod("INSTAPAY")}/> InstaPay</label>}
      {paymentOptions?.wallet && <label style={{display:"block",marginTop:12}}><input type="radio" name="paymentMethod" checked={paymentMethod === "WALLET"} onChange={() => setPaymentMethod("WALLET")}/> Mobile wallet</label>}
      {paymentMethod !== "COD" && <div style={{marginTop:16,display:"grid",gap:10}}>
        <p>Transfer to: <strong dir="ltr">{paymentMethod === "INSTAPAY" ? paymentOptions?.address : paymentOptions?.number}</strong></p>
        <label><input type="radio" name="paymentPlan" checked={paymentPlan === "FULL"} onChange={() => setPaymentPlan("FULL")}/> Pay full order</label>
        <label><input type="radio" name="paymentPlan" checked={paymentPlan === "DEPOSIT"} onChange={() => setPaymentPlan("DEPOSIT")}/> Pay {paymentOptions?.depositPercent}% deposit, remainder on delivery</label>
        <p>Transfer now: <strong>{formatMoney((paymentPlan === "FULL" ? totals.totalCents : Math.round(totals.totalCents * (paymentOptions?.depositPercent || 30) / 100)) / 100)}</strong></p>
        <p>Remaining on delivery: <strong>{formatMoney((paymentPlan === "FULL" ? 0 : totals.totalCents - Math.round(totals.totalCents * (paymentOptions?.depositPercent || 30) / 100)) / 100)}</strong></p>
        <label>Transfer reference or sender number<input required minLength={5} maxLength={120} value={transferReference} onChange={e => setTransferReference(e.target.value)} placeholder="Transaction reference" /></label>
        <small>Payment is subject to manual verification. Submitting a reference does not confirm receipt.</small>
      </div>}
    </section><p className="shop-consent">By confirming, you agree to our <Link href="/shipping">shipping policy</Link> and <Link href="/returns">returns policy</Link>.</p>{error && <p className="shop-error" role="alert">{error}</p>}<div className="shop-checkout-confirm-bar"><div><span>{awaitingShipping ? "Subtotal · choose governorate" : "Total · Payment summary"}</span><strong>{displayedTotal}</strong></div><button type="submit" disabled={busy || couponBusy || missing || !settings.enabled || !governorate || (!!coupon.trim() && !activeQuote)} className="shop-button">{busy ? "Placing order…" : "CONFIRM ORDER →"}</button></div><Link className="shop-checkout-back" href="/cart">← Return to your bag</Link></form>}
  </div>{summary}</div>;
}
