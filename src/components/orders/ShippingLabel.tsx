'use client';
import { useEffect, useRef, useState } from 'react';
import { shippingCollection, type ShippingLabelOrder } from '@/lib/shipping-label';
import { renderShippingLabel } from '@/lib/shipping-label-canvas';

export function ShippingLabel({ order }: { order: ShippingLabelOrder }) {
  const preview = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError('');
    document.fonts.ready.then(() => {
      if (cancelled || !preview.current) return;
      try {
        const collection = `${new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(shippingCollection(order))} ${order.currency}`;
        const rendered = renderShippingLabel(order, collection, getComputedStyle(preview.current).fontFamily);
        rendered.style.width = '50mm';
        rendered.style.height = '70mm';
        rendered.setAttribute('role', 'img');
        rendered.setAttribute('aria-label', `بوليصة الطلب ${order.number}، العميل ${order.customer}، الهاتف ${order.phone}، العنوان ${order.address}، المنتجات ${order.items.map(item => `${item.title} × ${item.quantity}`).join('، ')}، المطلوب تحصيله ${collection}`);
        preview.current.replaceChildren(rendered);
        canvas.current = rendered;
        setReady(true);
      } catch {
        setError('تعذر تجهيز البوليصة. أعد تحميل الصفحة وحاول مرة أخرى.');
      }
    });
    return () => { cancelled = true; canvas.current = null; };
  }, [order]);

  async function download() {
    if (!canvas.current) return;
    setBusy(true);
    setError('');
    try {
      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.current!.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png');
      });
      const { createShippingLabelPdf } = await import('@/lib/shipping-label-pdf');
      const bytes = await createShippingLabelPdf(new Uint8Array(await png.arrayBuffer()));
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'auraic-shipping-label-50x70mm.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError('تعذر تحميل البوليصة. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-lg space-y-5 p-5">
    <div className="flex flex-wrap items-center gap-3">
      <span>مقاس الاستيكر: ٥ × ٧ سم</span>
      <button type="button" disabled={!ready || busy} onClick={download} className="rounded-xl bg-[#191735] px-5 py-3 text-white disabled:opacity-50">{busy ? 'جارٍ تجهيز الملف…' : 'تحميل البوليصة PDF'}</button>
    </div>
    <p className="text-sm text-slate-500">افتح ملف PDF في تطبيق الطابعة. اختار Custom بمقاس عرض ٥٠ × طول ٧٠ مم، وAspect Fit بدون هوامش.</p>
    <div ref={preview} className="mx-auto w-fit bg-white text-black" style={{ minWidth: '50mm', minHeight: '70mm' }} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </main>;
}
