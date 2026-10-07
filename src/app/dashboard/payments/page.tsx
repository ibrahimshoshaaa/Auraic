"use client";
import { useEffect, useState } from "react";
type Payment = { id: string; orderNumber: string | null; customerRef: string | null; customerPhone: string | null; method: string; plan: string; reference: string; requestedAmount: number; total: number; depositAmount: number; review: string };
type Refund = { id: string; orderNumber: string | null; customerRef: string | null; customerPhone: string | null; amount: number };
export default function PaymentsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [refundRefs, setRefundRefs] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function refresh() {
    try { const response = await fetch("/api/payments/review", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to load"); setPayments(body.data);
      const refundResponse = await fetch("/api/payments/refunds", { cache: "no-store" });
      const refundBody = await refundResponse.json();
      if (!refundResponse.ok) throw new Error(refundBody.error || "Unable to load refunds");
      setRefunds(refundBody.data); }
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
  async function confirmRefund(id: string) {
    const reference = (refundRefs[id] || "").trim();
    if (reference.length < 3) { setError("أدخل مرجع عملية رد المبلغ"); return; }
    if (!window.confirm("هل تأكدت من إرسال المبلغ للعميل؟")) return;
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/payments/refund-confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id, reference }) });
      if (!response.ok) throw new Error("تعذر تأكيد الاسترداد");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
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
    <section className="space-y-3 pt-6">
      <h2 className="text-xl font-bold">مبالغ المرتجعات المنتظرة</h2>
      <p className="text-sm text-slate-600">تأكد من إرسال المبلغ للعميل قبل تأكيد الاسترداد.</p>
      {refunds.length === 0 && <p>لا توجد مبالغ استرداد معلقة.</p>}
      {refunds.map(refund => <article key={refund.id} className="space-y-3 rounded-xl border bg-white p-5">
        <h3 className="font-bold">طلب {refund.orderNumber || refund.id} — {refund.customerRef}</h3>
        <p>المبلغ المطلوب رده: <strong>{refund.amount} EGP</strong> · هاتف العميل: {refund.customerPhone}</p>
        <label className="block">مرجع عملية رد المبلغ
          <input className="mt-1 block w-full rounded-lg border p-2" value={refundRefs[refund.id] || ""} onChange={event => setRefundRefs(previous => ({ ...previous, [refund.id]: event.target.value }))} placeholder="رقم العملية" />
        </label>
        <button disabled={busy === refund.id || refund.amount <= 0} onClick={() => void confirmRefund(refund.id)} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">تأكيد إرسال المبلغ للعميل</button>
      </article>)}
    </section>
  </main>;
}
