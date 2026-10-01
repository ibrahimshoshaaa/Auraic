"use client";

import Link from "next/link";
import { ImageLinks } from "@/components/storefront/ImageLinks";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Material = { id: string; name: string; unit: string; category: string };
type Line = { key: number; materialId: string; quantity: string };

export function SimpleProductForm({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const nextKey = useRef(1);
  const requestId = useRef<string | null>(null);
  const [step, setStep] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("العطور");
  const [images, setImages] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const steps = ["بيانات المنتج", "الصور", "وصفة العطر", "الوصف والنشر"];
  function goNext() {
    const fields = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-step]:not([hidden]) input, [data-step]:not([hidden]) select");
    if (fields && Array.from(fields).some(field => !field.reportValidity())) return;
    setError(""); setStep(current => Math.min(3, current + 1));
  }
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 0, materialId: "", quantity: "" }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputClass = "mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-[#96723c]";
  function update(key: number, changes: Partial<Line>) { setLines((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line)); }
  function addMaterial(material: Material) {
    setLines((current) => {
      if (current.some((line) => line.materialId === material.id)) return current;
      const next = { materialId: material.id, quantity: material.unit.toLowerCase() === "ml" ? "" : "1" };
      const empty = current.find((line) => !line.materialId);
      return empty ? current.map((line) => line.key === empty.key ? { ...line, ...next } : line)
        : current.length < 30 ? [...current, { key: nextKey.current++, ...next }] : current;
    });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (step < 3) { goNext(); return; } setBusy(true); setError("");
    if (new Set(lines.map((line) => line.materialId)).size !== lines.length) { setError("اختار كل خامة مرة واحدة فقط."); setBusy(false); return; }
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/products/simple", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, name: name.trim(), storefrontDescription: description, storefrontCategory: category, storefrontImages: images, storefrontPublished: published, storefrontFeatured: featured, price: Number(price), materials: lines.map((line) => ({ materialId: line.materialId, quantity: Number(line.quantity) })) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر حفظ المنتج");
      requestId.current = null;
      window.dispatchEvent(new Event("dashboard-navigation-start"));
      router.push(`/dashboard/products/${body.data.productId}`); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "تعذر حفظ المنتج"); setBusy(false); }
  }
  return <form ref={formRef} onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <nav aria-label="خطوات إضافة المنتج" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{steps.map((title, index) => <button key={title} type="button" disabled={busy || index > step} onClick={() => setStep(index)} aria-current={index === step ? "step" : undefined} className={`rounded-xl px-3 py-3 text-sm font-semibold ${index === step ? "bg-[#191735] text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}. {title}</button>)}</nav>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <fieldset data-step hidden={step !== 0} disabled={busy || step !== 0} className="space-y-5"><legend className="mb-4 text-xl font-bold">بيانات المنتج</legend>
    <label className="block text-sm font-semibold">اسم العطر وحجمه<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="مثال: عطر عود ٣٠ مل" className={inputClass} /></label>
    <label className="block text-sm font-semibold">سعر بيع العطر (جنيه)<input required type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClass} /></label>
    <label className="block text-sm font-semibold">القسم<input required maxLength={80} value={category} onChange={event => setCategory(event.target.value)} placeholder="مثال: العطور الرجالية" className={inputClass} /></label></fieldset>
    <fieldset data-step hidden={step !== 1} disabled={busy || step !== 1} className="space-y-4"><legend className="mb-4 text-xl font-bold">صور المنتج</legend><p className="text-sm text-slate-500">الصورة الأولى هي الرئيسية. ارفع صور المنتج أو أضف روابطها.</p><ImageLinks name="images" initial={[]} onChange={setImages} /></fieldset>
    <fieldset data-step hidden={step !== 2} disabled={busy || step !== 2} className="space-y-5"><legend className="mb-4 text-xl font-bold">وصفة العطر</legend>
    <div><h2 className="text-lg font-bold">الخامات المستخدمة في العطر الواحد</h2><p className="mt-1 text-sm text-slate-500">اضغط على الخامة لإضافتها، ثم حدد الكمية التي تُخصم عند بيع قطعة واحدة.</p></div>
    {!materials.length && <p className="rounded-xl bg-amber-50 p-4 text-sm">أضف خاماتك من <Link href="/dashboard/inventory" className="font-semibold underline">المخزون</Link> أولًا.</p>}
    {!!materials.length && <div className="space-y-3 rounded-2xl border border-[#e5e4ec] bg-[#f7f7fb] p-4">
      <p className="text-sm font-semibold text-[#191735]">إضافة سريعة من المخزون</p>
      {[...new Set(materials.map((material) => material.category))].map((category) => <div key={category}>
        <p className="mb-2 text-xs font-semibold text-slate-500">{category}</p>
        <div className="flex flex-wrap gap-2">{materials.filter((material) => material.category === category).map((material) => <button key={material.id} type="button" disabled={busy || lines.some((line) => line.materialId === material.id) || lines.length >= 30 && !lines.some((line) => !line.materialId)} onClick={() => addMaterial(material)} className="rounded-full border border-[#d7d6e2] bg-white px-3 py-2 text-sm text-[#191735] disabled:bg-[#e7e6ee] disabled:text-slate-500">{lines.some((line) => line.materialId === material.id) ? "✓ " : "+ "}{material.name} · {material.unit}</button>)}</div>
      </div>)}
    </div>}
    {lines.map((line) => {
      const selected = materials.find((material) => material.id === line.materialId);
      return <div key={line.key} className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
        <label className="text-sm font-semibold">الخامة<select required value={line.materialId} onChange={(event) => { const material = materials.find((item) => item.id === event.target.value); update(line.key, { materialId: event.target.value, quantity: material?.unit.toLowerCase() === "ml" ? "" : line.quantity || "1" }); }} className={inputClass}><option value="">اختر خامة</option>{[...new Set(materials.map((material) => material.category))].map((category) => <optgroup key={category} label={category}>{materials.filter((material) => material.category === category && (!lines.some((entry) => entry.key !== line.key && entry.materialId === material.id))).map((material) => <option key={material.id} value={material.id}>{material.name} ({material.unit})</option>)}</optgroup>)}</select></label>
        <label className="text-sm font-semibold">الكمية ({selected?.unit || "الوحدة"})<input required type="number" min="0.000001" step="any" inputMode="decimal" value={line.quantity} onChange={(event) => update(line.key, { quantity: event.target.value })} className={inputClass} /></label>
        {lines.length > 1 && <button type="button" onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))} className="rounded-lg border border-red-200 px-3 py-3 text-sm text-red-700">حذف</button>}
      </div>;
    })}
    <button type="button" disabled={lines.length >= 30} onClick={() => setLines((current) => [...current, { key: nextKey.current++, materialId: "", quantity: "" }])} className="rounded-xl border border-[#191735] px-4 py-3 text-sm font-semibold text-[#191735]">+ خامة أخرى</button>
    </fieldset>
    <fieldset data-step hidden={step !== 3} disabled={busy || step !== 3} className="space-y-5"><legend className="mb-4 text-xl font-bold">الوصف والنشر</legend>
      <label className="block text-sm font-semibold">وصف المنتج<textarea rows={5} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} placeholder="وصف العطر ونوتاته والمناسبة التي يناسبها…" className={inputClass} /></label>
      <div className="space-y-3 rounded-xl bg-slate-50 p-4"><label className="flex items-center gap-3"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} />ظاهر في المتجر</label><label className="flex items-center gap-3"><input type="checkbox" checked={featured} onChange={event => setFeatured(event.target.checked)} />منتج مميز في الرئيسية</label></div>
      <div className="rounded-xl border p-4 text-sm leading-8"><p className="font-bold">مراجعة قبل الحفظ</p><p>{name} · {price} جنيه · {category}</p><p>{images.length} صور · {lines.filter(line => line.materialId).length} مكونات في الوصفة</p><p>{published ? "سيظهر في المتجر بعد الحفظ" : "سيُحفظ دون نشر في المتجر"}</p></div>
    </fieldset>
    <div className="flex gap-3 border-t border-slate-100 pt-5">{step > 0 && <button type="button" disabled={busy} onClick={() => setStep(current => current - 1)} className="rounded-xl border px-5 py-3">السابق</button>}{step < 3 ? <button type="button" onClick={goNext} className="flex-1 rounded-xl bg-[#191735] px-6 py-3.5 font-semibold text-white">التالي</button> : <button type="submit" disabled={busy || !materials.length} className="flex-1 rounded-xl bg-[#191735] px-6 py-3.5 font-semibold text-white disabled:opacity-50">{busy ? "جارٍ الحفظ..." : "حفظ المنتج"}</button>}</div>
  </form>;
}
