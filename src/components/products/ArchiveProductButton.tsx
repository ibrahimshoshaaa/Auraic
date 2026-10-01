"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function archive() {
    if (!window.confirm("إخفاء المنتج من المتجر والطلبات الجديدة؟ ستبقى الطلبات والوصفات القديمة محفوظة.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "تعذرت أرشفة المنتج"); }
      router.push("/dashboard/products"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "تعذرت أرشفة المنتج"); setBusy(false); }
  }
  return <div><button type="button" onClick={archive} disabled={busy} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{busy ? "جارٍ الحفظ…" : "إخفاء المنتج"}</button>{error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}</div>;
}
