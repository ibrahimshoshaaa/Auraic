'use client';
import { useEffect, useRef, useState } from 'react';
import { shippingCollection, type ShippingLabelOrder } from '@/lib/shipping-label';
export function ShippingLabel({ order }: { order: ShippingLabelOrder }) {
  const content = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      if (!content.current || !label.current) return;
      const style = getComputedStyle(label.current);
      const height = label.current.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setScale(Math.min(1, height / Math.max(1, content.current.scrollHeight)));
    };
    const observer = new ResizeObserver(fit);
    if (content.current) observer.observe(content.current);
    fit();
    return () => observer.disconnect();
  }, [order]);
  const money = (n: number) => `${new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(n)} ${order.currency}`;
  return <main className="mx-auto max-w-lg space-y-5 p-5">
    <div className="flex flex-wrap items-center gap-3"><span>مقاس الاستيكر: ٥ × ١٠ سم</span><button onClick={() => window.print()} className="rounded-xl bg-[#191735] px-5 py-3 text-white">طباعة</button></div>
    <p className="text-sm text-slate-500">اختار مقاس ٥٠ × ١٠٠ مم في إعدادات الطابعة، أو احفظ PDF وافتحه في تطبيق الطابعة.</p>
    <article ref={label} id="shipping-label" dir="rtl" style={{ width: '50mm', height: '100mm', padding: '3mm', boxSizing: 'border-box', margin: 'auto', background: 'white', color: 'black', fontSize: '12px', overflowWrap: 'anywhere' }}>
      <div ref={content} style={{ transform: `scale(${scale})`, transformOrigin: 'top right' }}>
        <h1 style={{ textAlign: 'center', fontWeight: 800, fontSize: '20px' }}>Auraic</h1><hr />
        <p><b>رقم الطلب: </b><span dir="ltr">{order.number.replace(/^#+/, '')}</span></p>
        <p style={{ fontSize: '17px', fontWeight: 800 }}>العميل: {order.customer}</p>
        <p style={{ fontSize: '17px', fontWeight: 800 }}>الهاتف: <span dir="ltr">{order.phone}</span></p>
        <p style={{ fontSize: '16px', fontWeight: 800 }}>العنوان: {order.address}</p><hr />
        <h2>المنتجات</h2>{order.items.map((item, i) => <p key={i}>{item.title} × {item.quantity}</p>)}
        <p style={{ fontSize: '16px', fontWeight: 800, borderTop: '2px solid black', paddingTop: '3mm' }}>المطلوب تحصيله: <span dir="ltr">{money(shippingCollection(order))}</span></p>
      </div>
    </article>
    <style>{`#shipping-label p { margin: 1.5mm 0; } #shipping-label hr { margin: 2mm 0; border-top: 1px dashed black; } @media print { @page { size: 50mm 100mm; margin: 0; } body * { visibility: hidden; } #shipping-label, #shipping-label * { visibility: visible; } #shipping-label { position: absolute; top: 0; right: 0; margin: 0 !important; } }`}</style>
  </main>;
}
