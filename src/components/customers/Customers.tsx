"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/customers";

type Order = { id: string; orderNumber: string | null; occurredAt: string; currency: string; total: string; refunded: string; manualStatus: string | null; financialStatus: string | null; customerAddress: string | null; items: { title: string; quantity: string }[]; returns: { id: string; totalAmount: string; returnCost: string; status: string }[] };
type Detail = Customer & { orders: Order[] };
type List = { data: Customer[]; count: number; pages: number; stats: { total: number; repeat: number; unidentified: number; delivered: Record<string, number> } };
const money = (cents: number, currency: string) => `${(cents / 100).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const date = (value: string) => new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" }).format(new Date(value));
const statuses: Record<string, string> = { NEW: "قيد التجهيز", PREPARED: "تم التجهيز", SHIPPING: "جاري الشحن", DELIVERED: "تم التسليم", RETURNED: "مرتجع", PAID: "مدفوع", PENDING: "غير مدفوع", PARTIALLY_PAID: "مدفوع جزئيًا", REFUNDED: "مسترد", PARTIALLY_REFUNDED: "مسترد جزئيًا" };
const field = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c4a265]";
const box = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "تعذر التحميل");
  return data;
}

export function Customers({ canCreateOrder, initialQuery = "" }: { canCreateOrder: boolean; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery); const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState("recent"); const [page, setPage] = useState(1);
  const [list, setList] = useState<List>(); const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); const [epoch, setEpoch] = useState(0);
  const [key, setKey] = useState<string>(); const [detail, setDetail] = useState<Detail>();
  const [detailPage, setDetailPage] = useState(1); const [detailPages, setDetailPages] = useState(1);
  const [detailError, setDetailError] = useState(""); const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError("");
    get<List>(`/api/customers?q=${encodeURIComponent(query)}&sort=${sort}&page=${page}`, abort.signal)
      .then(setList).catch(e => { if (!abort.signal.aborted) setError(e.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [query, sort, page, epoch]);
  useEffect(() => {
    if (!key) return;
    const abort = new AbortController(); setDetail(undefined); setDetailError(""); setNotice("");
    if (!dialog.current?.open) dialog.current?.showModal();
    get<{ data: Detail; pages: number }>(`/api/customers?key=${encodeURIComponent(key)}&page=${detailPage}`, abort.signal)
      .then(data => { setDetail(data.data); setDetailPages(data.pages); })
      .catch(e => { if (!abort.signal.aborted) setDetailError(e.message); });
    return () => abort.abort();
  }, [key, detailPage, epoch]);
  function close() { dialog.current?.close(); setKey(undefined); setDetail(undefined); }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice("تم النسخ"); }
    catch { setNotice("تعذر النسخ تلقائيًا؛ يمكنك تحديد النص ونسخه."); }
  }
  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
    <header className="flex items-end justify-between gap-3"><div><p className="text-sm text-[#96723c]">علاقات العملاء</p><h1 className="mt-1 text-3xl font-bold">العملاء</h1><p className="mt-2 text-sm text-slate-500">بيانات التواصل وسجل الطلبات من المتجر والمحل في مكان واحد.</p></div><button className="rounded-xl border bg-white px-4 py-3 text-sm" onClick={() => setEpoch(v => v + 1)}>تحديث</button></header>
    {list && <section className="grid gap-3 sm:grid-cols-3" aria-label="ملخص العملاء">
      <div className={box}><p className="text-sm text-slate-500">إجمالي العملاء</p><strong className="mt-3 block text-3xl">{list.stats.total}</strong><p className="mt-2 text-xs text-slate-500">{list.stats.unidentified} بدون رقم موثوق — كل طلب مستقل</p></div>
      <div className={box}><p className="text-sm text-slate-500">عملاء متكررون</p><strong className="mt-3 block text-3xl">{list.stats.repeat}</strong><p className="mt-2 text-xs text-slate-500">أكثر من طلب على نفس الهاتف</p></div>
      <div className="rounded-2xl bg-[#191735] p-5 text-white"><p className="text-sm text-white/70">صافي قيمة الطلبات المسلّمة</p>{Object.entries(list.stats.delivered).map(([currency, amount]) => <strong dir="ltr" className="mt-3 block text-xl" key={currency}>{money(amount, currency)}</strong>)}<p className="mt-2 text-xs text-white/70">بعد رد المبالغ؛ لا يشمل الطلبات قيد التنفيذ</p></div>
    </section>}
    <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(q); }}>
      <input className={field} aria-label="بحث العملاء" placeholder="اسم العميل، الهاتف أو العنوان" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="ترتيب العملاء" className={field} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="recent">الأحدث نشاطًا</option><option value="orders">الأكثر طلبًا</option><option value="spent">الأعلى شراءً (EGP)</option></select>
      <button className="rounded-xl bg-[#191735] px-6 py-3 text-white">بحث</button>
    </form>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{error} <button onClick={() => setEpoch(v => v + 1)} className="underline">إعادة المحاولة</button></p>}
    {loading ? <p role="status" className="p-10 text-center text-slate-500">جارٍ تحميل العملاء…</p> : !error && <>
      <div className="flex justify-between text-sm text-slate-500"><span>سجل العملاء</span><span>{list?.count ?? 0} نتيجة</span></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list?.data.map(c => <button key={c.key} onClick={() => { setDetailPage(1); setKey(c.key); }} className={`${box} text-right transition hover:border-[#c4a265] focus-visible:ring-2 focus-visible:ring-[#c4a265]`}>
        <div className="flex items-start gap-3"><span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f0edfa] text-xl text-[#191735]">♙</span><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{c.name}</h2><p dir="ltr" className="mt-1 text-right text-sm text-slate-500">{c.phone ? `+${c.phone}` : "الهاتف غير متاح"}</p></div><span className="rounded-full bg-[#f0edfa] px-3 py-1 text-xs">{c.ordersCount > 1 ? "متكرر" : "جديد"}</span></div>
        <p className="mt-4 truncate text-sm text-slate-500">{c.address || "العنوان غير متاح"}</p><div className="mt-4 flex justify-between border-t pt-3 text-xs text-slate-500"><span>{c.ordersCount} طلب · {c.deliveredCount} مسلّم</span><span>{date(c.lastOrderAt)}</span></div>
        {Object.entries(c.totals).map(([currency, values]) => <p key={currency} className="mt-3 text-sm">مشتريات مسلّمة: <strong dir="ltr">{money(values.deliveredValue, currency)}</strong></p>)}
      </button>)}</div>
      {!list?.data.length && <div className={`${box} py-12 text-center`}><h2 className="text-xl font-bold">{query ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}</h2><p className="mt-3 text-slate-500">يُضاف العميل تلقائيًا عند استقبال طلب من المتجر أو تسجيل بيع يدوي.</p></div>}
      {(list?.pages ?? 0) > 1 && <nav className="flex items-center justify-center gap-4" aria-label="صفحات العملاء"><button disabled={page <= 1} className="disabled:opacity-40" onClick={() => setPage(p => p - 1)}>السابق</button><span>{page} / {list?.pages}</span><button disabled={page >= (list?.pages ?? 1)} className="disabled:opacity-40" onClick={() => setPage(p => p + 1)}>التالي</button></nav>}
    </>}
    <dialog ref={dialog} onCancel={close} onClose={() => setKey(undefined)} onClick={e => { if (e.target === dialog.current) close(); }} aria-labelledby="customer-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-auto rounded-3xl bg-[#f4f5fa] p-0 text-[#191735] shadow-xl backdrop:bg-black/50">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5"><h2 id="customer-title" className="text-xl font-bold">ملف العميل</h2><button aria-label="إغلاق ملف العميل" onClick={close} className="rounded-lg px-3 py-2">✕</button></div>
      <div className="space-y-5 p-5">{detailError ? <p role="alert">{detailError} <button className="underline" onClick={() => setEpoch(v => v + 1)}>إعادة المحاولة</button></p> : !detail ? <p role="status">جارٍ تحميل التفاصيل…</p> : <>
        <section className={box}><h3 className="text-2xl font-bold">{detail.name}</h3><p dir="ltr" className="mt-2 text-right select-all">{detail.phone ? `+${detail.phone}` : "الهاتف غير متاح"}</p><p className="mt-3 select-all break-words text-sm leading-7">{detail.address || "العنوان غير متاح"}</p><p className="mt-3 text-xs text-slate-500">أول طلب: {date(detail.firstOrderAt)} · آخر طلب: {date(detail.lastOrderAt)}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">{detail.phone && <><a className="rounded-xl border px-4 py-2" href={`tel:+${detail.phone}`}>اتصال</a><a className="rounded-xl border px-4 py-2" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${detail.phone}`}>واتساب</a><button className="rounded-xl border px-4 py-2" onClick={() => copy(`+${detail.phone}`)}>نسخ الهاتف</button></>}{detail.address && <button className="rounded-xl border px-4 py-2" onClick={() => copy(detail.address)}>نسخ العنوان</button>}{canCreateOrder && detail.phone && detail.address && <Link href={`/dashboard/orders/new?customer=${encodeURIComponent(detail.key)}`} className="rounded-xl bg-[#191735] px-4 py-2 text-white">+ طلب جديد للعميل</Link>}</div><p aria-live="polite" className="mt-2 text-xs text-emerald-700">{notice}</p>
        </section>
        <section className={box}><div className="flex justify-between text-sm"><span>{detail.ordersCount} طلب</span><span>{detail.deliveredCount} مسلّم · {detail.returnedCount} مرتجع</span></div>{Object.entries(detail.totals).map(([currency, v]) => <div className="mt-4 space-y-2 border-t pt-3 text-sm" key={currency}><p>قيمة كل الطلبات: <b dir="ltr">{money(v.orderValue, currency)}</b></p><p>صافي المسلّم: <b dir="ltr">{money(v.deliveredValue, currency)}</b></p><p>مبالغ مستردة: <b dir="ltr">{money(v.refundedValue, currency)}</b></p></div>)}</section>
        <h3 className="text-lg font-bold">سجل الطلبات</h3>{detail.orders.map(order => <article className={box} key={order.id}><div className="flex flex-wrap justify-between gap-2"><Link className="font-bold underline" href={`/dashboard/orders?orderId=${encodeURIComponent(order.id)}`}>طلب #{(order.orderNumber || order.id.slice(-8)).replace(/^#+/, "")}</Link><span className="rounded-full bg-[#f0edfa] px-3 py-1 text-xs">{statuses[order.manualStatus || ""] || "حالة غير محددة"}</span></div><p className="mt-2 text-xs text-slate-500">{date(order.occurredAt)} · {statuses[order.financialStatus || ""] || "دفع غير محدد"} · {order.id.startsWith("web_") ? "المتجر" : "المحل"}</p><p dir="ltr" className="mt-3 text-right font-bold">{money(Math.round(Number(order.total) * 100), order.currency)}</p><div className="mt-3 space-y-1 text-sm">{order.items.map((item,i) => <p key={i}>{item.title} × {Number(item.quantity)}</p>)}</div><p className="mt-3 text-xs leading-6 text-slate-500">عنوان هذا الطلب: {order.customerAddress || "غير متاح"}</p>{order.returns.map(r => <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800" key={r.id}>مرتجع: {r.totalAmount ?? 0} {order.currency} · تكلفته: {r.returnCost} {order.currency}</p>)}</article>)}
        {detailPages > 1 && <div className="flex justify-between"><button disabled={detailPage <= 1} onClick={() => setDetailPage(p => p - 1)}>السابق</button><span>{detailPage} / {detailPages}</span><button disabled={detailPage >= detailPages} onClick={() => setDetailPage(p => p + 1)}>التالي</button></div>}
      </>}</div>
    </dialog>
  </main>;
}
