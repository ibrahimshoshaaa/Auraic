'use client';
import { useState } from 'react';
import { shippingCollection, type ShippingLabelOrder } from '@/lib/shipping-label';
export function ShippingLabel({ order }: { order: ShippingLabelOrder }) {
  const [width, setWidth] = useState('80');
  const money = (n: number) => `${new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(n)} ${order.currency}`;
  return <main className="mx-auto max-w-lg space-y-5 p-5">
    <div className="flex flex-wrap items-center gap-3"><label>عرض الورق <select value={width} onChange={e => setWidth(e.target.value)} className="rounded-lg border p-2"><option value="80">٨٠ مم</option><option value="58">٥٨ مم</option></select></label><button onClick={() => window.print()} className="rounded-xl bg-[#191735] px-5 py-3 text-white">طباعة البوليصة</button></div>
    <p className="text-sm text-slate-500">اختار الطابعة من نافذة الطباعة، أو احفظ PDF وافتحه في تطبيق الطابعة.</p>
    <article id="shipping-label" dir="rtl" style={{ width: `${Number(width) - 6}mm`, padding: '3mm', boxSizing: 'border-box', margin: 'auto', background: 'white', color: 'black', fontSize: '12px', overflowWrap: 'anywhere' }}>
      <h1 style={{ textAlign: 'center', fontWeight: 800, fontSize: '20px' }}>Auraic</h1><p>بوليصة شحن</p><hr />
      <p><b>رقم الطلب: </b><span dir="ltr">{order.number.replace(/^#+/, '')}</span></p>
      <p><b>العميل: </b>{order.customer}</p><p><b>الهاتف: </b><span dir="ltr">{order.phone}</span></p><p><b>العنوان: </b>{order.address}</p><hr />
      <h2>المنتجات</h2>{order.items.map((item, i) => <p key={i}>{item.title} × {item.quantity}</p>)}<hr />
      <p>قيمة الطلب بعد الخصم: <span dir="ltr">{money(order.total - order.shipping)}</span></p><p>الشحن: <span dir="ltr">{money(order.shipping)}</span></p><p>الإجمالي شامل الشحن: <span dir="ltr">{money(order.total)}</span></p>{order.deposit > 0 && <p>الديبوزت المدفوع: <span dir="ltr">{money(order.deposit)}</span></p>}
      <p style={{ fontSize: '16px', fontWeight: 800, borderTop: '2px solid black', paddingTop: '3mm' }}>المطلوب تحصيله: <span dir="ltr">{money(shippingCollection(order))}</span></p>
    </article>
    <style>{`#shipping-label p { margin: 2mm 0; } #shipping-label hr { margin: 3mm 0; border-top: 1px dashed black; } @media print { @page { size: ${width}mm auto; margin: 0; } body * { visibility: hidden; } #shipping-label, #shipping-label * { visibility: visible; } #shipping-label { position: absolute; top: 0; right: 0; margin: 0 !important; } }`}</style>
  </main>;
}
