"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";

export function OrderDiscount({ orderId, amount, total, deposit, updatedAt }: { orderId: string; amount: number; total: number; deposit: number; updatedAt: string }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const proposed = total + amount - Number(value);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/discount`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(value), updatedAt }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر حفظ الخصم");
      setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ الخصم"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <button type="button" onClick={() => { setValue(String(amount)); setError(""); setOpen(!open); }} disabled={busy} className="rounded-xl border border-[#514b8c] px-4 py-2 text-sm font-semibold text-[#514b8c]">{amount ? "تعديل خصم الأدمن" : "إضافة خصم"}</button>
    {open && <form onSubmit={save} className="space-y-3 rounded-xl bg-slate-50 p-4">
      <label htmlFor={id} className="block text-sm font-semibold">خصم إضافي بالجنيه (٠ لإلغاء الخصم)</label>
      <input id={id} type="number" min="0" step="0.01" required value={value} onChange={event => setValue(event.target.value)} className="w-full rounded-lg border bg-white p-3" />
      <p className="text-sm">الإجمالي بعد الخصم: {Number.isFinite(proposed) ? proposed.toFixed(2) : "—"} EGP · المطلوب تحصيله: {Number.isFinite(proposed) ? Math.max(0, proposed - deposit).toFixed(2) : "—"} EGP</p>
      <p className="text-xs text-slate-600">الخصم إضافي للكوبون، بحد أقصى قيمة المنتجات. بعد الحفظ أعد طباعة البوليصة وأبلغ الشحن بالمبلغ الجديد لو الطلب خرج بالفعل.</p>
      <div className="flex gap-2"><button type="submit" disabled={busy} className="rounded-lg bg-[#191735] px-4 py-2 text-white">{busy ? "جارٍ الحفظ..." : "حفظ الخصم"}</button><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">إلغاء</button></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>}
  </div>;
}
