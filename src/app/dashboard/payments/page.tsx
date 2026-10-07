"use client";
import { useEffect, useState } from "react";
type Payment = { id: string; orderNumber: string | null; customerRef: string | null; customerPhone: string | null; method: string; plan: string; reference: string; requestedAmount: number; total: number; depositAmount: number; review: string };
export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function refresh() {
    try { const response = await fetch("/api/payments/review", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to load"); setPayments(body.data); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load"); }
  }
  useEffect(() => { void refresh(); }, []);
  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    if (!window.confirm(decision === "APPROVED" ? "تأكدت من وصول التحويل فعلًا؟" : "رفض إثبات التحويل؟")) return;
    setBusy(id); setError("");
    try { const response = await fetch("/api/payments/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id, decision }) }); if (!response.ok) throw new Error("تعذرت المراجعة، حدث الصفحة وحاول مجددًا"); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setBusy(null); }
  }
  return <main className="mx-auto max-w-5xl space-y-5 p-6" dir="rtl"><h1 className="text-2xl font-bold">مراجعة التحويلات</h1><p className="text-sm text-slate-600">لا تؤكد التحويل قبل التحقق من وصوله إلى حسابك. الصور وأرقام العمليات ليست إثباتًا كافيًا وحدها.</p>{error && <p role="alert" className="text-red-700">{error}</p>}
    <button onClick={() => void refresh()} className="rounded-lg border p-2">تحديث</button>
    {payments.map(p => <article key={p.id} className="space-y-2 rounded-xl border bg-white p-5">
      <h2 className="font-bold">طلب {p.orderNumber || p.id} — {p.customerRef}</h2>
      <p>{p.method === "INSTAPAY" ? "InstaPay" : "محفظة"} · {p.plan === "FULL" ? "دفع كامل" : "عربون"} · {p.review === "PENDING" ? "بانتظار المراجعة" : p.review === "APPROVED" ? "تم التأكيد" : "مرفوض"}</p>
      <p>المطلوب تحويله: <strong>{p.requestedAmount} EGP</strong> · إجمالي الطلب: {p.total} EGP</p>
      <p>رقم التحويل: <span dir="ltr">{p.reference}</span> · هاتف العميل: {p.customerPhone}</p>
      {p.review === "PENDING" && <div className="flex gap-3"><button disabled={busy === p.id} onClick={() => void review(p.id, "APPROVED")} className="rounded-lg bg-emerald-700 px-4 py-2 text-white">تأكيد وصول المبلغ</button><button disabled={busy === p.id} onClick={() => void review(p.id, "REJECTED")} className="rounded-lg border px-4 py-2">رفض</button></div>}
    </article>)}
  </main>;
}
