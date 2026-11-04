"use client";
import Link from "next/link";
import { useState } from "react";
type Entry={id:string;number:string;date:string;currency:string;total:number};
export function ReturnWarning({orderId,count}:{orderId:string;count:number}) {
  const [entries,setEntries]=useState<Entry[]|null>(null);const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function toggle(){if(open){setOpen(false);return;}setOpen(true);if(entries)return;setBusy(true);setError("");try{const response=await fetch(`/api/orders/${encodeURIComponent(orderId)}/return-history`,{cache:"no-store"});const body=await response.json();if(!response.ok)throw Error(body.error||"تعذر تحميل السجل");setEntries(body.data);}catch(e){setError(e instanceof Error?e.message:"تعذر تحميل السجل");}finally{setBusy(false);}}
  return <aside className="mx-4 mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 sm:mx-5" aria-label="مرتجعات سابقة لنفس الرقم">
    <p className="font-semibold">تنبيه: الرقم ده مرتبط بـ {count} طلب مرتجع سابق</p><p className="mt-1 text-xs">راجع السجل قبل تأكيد الطلب. سبب الإرجاع غير مسجل.</p>
    <button type="button" onClick={toggle} disabled={busy} aria-expanded={open} className="mt-2 rounded-lg border border-amber-400 px-3 py-2 font-semibold">{busy?"جارٍ التحميل…":open?"إخفاء السجل":"عرض الطلبات المرتجعة السابقة"}</button>
    {open&&<div className="mt-2 space-y-2">{error&&<p role="alert">{error} <button type="button" className="underline" onClick={()=>{setOpen(false);}}>إغلاق وإعادة المحاولة</button></p>}{entries?.map(entry=><p key={entry.id} className="border-t border-amber-200 pt-2"><Link className="font-semibold underline" href={`/dashboard/orders?orderId=${encodeURIComponent(entry.id)}`}>طلب #{entry.number}</Link> · {new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeZone:"Africa/Cairo"}).format(new Date(entry.date))} · {entry.total.toFixed(2)} {entry.currency} · تم الإرجاع</p>)}</div>}
  </aside>;
}
