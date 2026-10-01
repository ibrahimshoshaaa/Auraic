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
  const { lines, ready, update, clear } = useCart();
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
        requestId: requestId.current, expectedTotalCents: totals.totalCents, name: data.get("name"), phone: data.get("phone"), governorate: data.get("governorate"), address: data.get("address"),
        items: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })),
      }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "تعذر إرسال الطلب");
      setResult(body.data); clear(); requestId.current = null;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "تعذر إرسال الطلب. حاول ثانية."); }
    finally { setBusy(false); }
  }
  if (result) return <section className="shop-success" role="status"><span>✓</span><p className="shop-eyebrow">THANK YOU</p><h1>طلبك وصل لنا</h1><p>رقم طلبك <strong dir="ltr">{result.orderNumber}</strong></p><p>الإجمالي عند الاستلام: <strong>{formatMoney(result.total)}</strong></p><p>هنراجع طلبك ونتواصل معاك لتأكيد التفاصيل.</p><Link className="shop-button" href="/products">اكتشف المزيد</Link></section>;
  if (!ready) return <p className="shop-empty" role="status">تحميل حقيبتك…</p>;
  if (!lines.length) return <section className="shop-empty"><h1>حقيبتك تنتظر عطرك</h1><p>ابدأ باختيار عطر من مجموعة Auraic.</p><Link href="/products" className="shop-button">تصفح العطور ←</Link></section>;
  const summary = <aside className="shop-order-summary"><h2>ملخص الطلب</h2><p><span>العطور</span><strong>{formatMoney(totals.subtotalCents / 100)}</strong></p><p><span>الشحن</span><strong>{totals.shippingCents ? formatMoney(totals.shippingCents / 100) : "مجاني"}</strong></p><p className="shop-total"><span>الإجمالي</span><strong>{formatMoney(totals.totalCents / 100)}</strong></p>{settings.freeShippingFrom > 0 && totals.shippingCents > 0 && <small>شحن مجاني للطلبات من {formatMoney(settings.freeShippingFrom)}</small>}<p className="shop-payment-label">الدفع عند الاستلام</p>{!checkout && <Link aria-disabled={missing || !settings.enabled} className={`shop-button ${missing || !settings.enabled ? "disabled" : ""}`} href={missing || !settings.enabled ? "/cart" : "/checkout"}>إتمام الطلب ←</Link>}</aside>;
  return <div className="shop-checkout-grid"><div>{missing && <p role="alert" className="shop-error">أحد العطور لم يعد متاحًا؛ احذفه من الحقيبة لإكمال الطلب.</p>}{!settings.enabled && <p className="shop-error">استقبال الطلبات متوقف حاليًا.</p>}
    {!checkout ? <div className="shop-cart-items">{lines.map(line => { const found = catalog.get(line.variantId); return <article key={line.variantId} className="shop-cart-item"><Image src={found?.product.images[0] || "/auraic-bottle.svg"} width={110} height={140} alt={line.name} unoptimized /><div><Link href={`/products/${line.productId}`}><h2>{found?.product.name || line.name}</h2></Link><p>{found?.title || line.size}</p><strong>{found ? formatMoney(found.price) : "غير متاح"}</strong><div className="shop-quantity"><button aria-label={`تقليل كمية ${line.name}`} onClick={() => update(line.variantId, line.quantity - 1)}>−</button><span>{line.quantity}</span><button aria-label={`زيادة كمية ${line.name}`} disabled={line.quantity >= 20} onClick={() => update(line.variantId, line.quantity + 1)}>+</button></div></div><button className="shop-remove" onClick={() => update(line.variantId, 0)} aria-label={`حذف ${line.name}`}>×</button></article>; })}</div>
    : <form onSubmit={submit} className="shop-checkout-form"><h2>بيانات التوصيل</h2><p>أدخل بياناتك، وهنأكد معاك الطلب قبل الشحن.</p><fieldset disabled={busy}><label>الاسم بالكامل<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="اسم المستلم" /></label><label>رقم الموبايل<input name="phone" type="tel" inputMode="tel" required pattern="01[0125][0-9]{8}" autoComplete="tel-national" placeholder="01xxxxxxxxx" dir="ltr" /></label><label>المحافظة<select name="governorate" required defaultValue=""><option value="" disabled>اختر المحافظة</option>{governorates.map(name => <option key={name}>{name}</option>)}</select></label><label>العنوان بالتفصيل<textarea name="address" required minLength={10} maxLength={400} rows={3} autoComplete="street-address" placeholder="المنطقة، الشارع، رقم العمارة والشقة، وعلامة مميزة" /></label></fieldset><div className="shop-checkout-lines">{lines.map(line => <p key={line.variantId}>{catalog.get(line.variantId)?.product.name || line.name} · {line.size} <b>× {line.quantity}</b></p>)}</div><p className="shop-consent">بتأكيدك الطلب أنت موافق على <Link href="/shipping">سياسة الشحن</Link> و<Link href="/returns">سياسة الإرجاع</Link>.</p>{error && <p className="shop-error" role="alert">{error}</p>}<button disabled={busy || missing || !settings.enabled} className="shop-button">{busy ? "◌ جارٍ تسجيل طلبك…" : "تأكيد الطلب · الدفع عند الاستلام"}</button><Link className="shop-inline-link" href="/cart">تعديل الحقيبة</Link></form>}
  </div>{summary}</div>;
}
