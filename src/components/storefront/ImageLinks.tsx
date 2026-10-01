"use client";
import { useState } from "react";
import Image from "next/image";
export function ImageLinks({ name, initial, onChange }: { name: string; initial: string[]; onChange?: (images: string[]) => void }) {
  const [value, setValue] = useState(initial.join("\n")); const [uploading, setUploading] = useState(false); const [error, setError] = useState("");
  function change(value: string) { setValue(value); onChange?.(value.split("\n").map(url => url.trim()).filter(Boolean)); }
  const images = value.split("\n").map(url => url.trim()).filter(url => url.startsWith("https://"));
  return <div className="space-y-3"><textarea className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm" dir="ltr" name={name} rows={3} value={value} onChange={event => change(event.target.value)} placeholder="https://..." />
    <div className="flex flex-wrap gap-3">{images.slice(0, 8).map((url, index) => <Image key={url + index} src={url} unoptimized width={64} height={72} alt={`الصورة ${index + 1}`} className="rounded-lg border object-cover" />)}</div>
    <label className="inline-flex cursor-pointer rounded-xl border px-4 py-2.5 text-xs font-semibold"><span>{uploading ? "جارٍ رفع الصورة…" : "+ رفع صورة من جهازك"}</span><input type="file" className="sr-only" accept="image/jpeg,image/png" disabled={uploading || images.length >= 8} onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return; event.target.value = ""; setUploading(true); setError("");
      try { const data = new FormData(); data.set("file", file); const response = await fetch("/api/admin/storefront/images", { method: "POST", body: data }); const body = await response.json(); if (!response.ok) throw new Error(body.error); change(`${value.trim()}${value.trim() ? "\n" : ""}${body.data.url}`); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "تعذر الرفع"); } finally { setUploading(false); }
    }} /></label><p className="text-xs font-normal text-slate-500">حتى 8 صور. JPG أو PNG حتى 3 ميجابايت، أو رابط HTTPS في كل سطر. احفظ النموذج بعد إضافة الصور.</p>{uploading && <input type="text" required value="" readOnly className="sr-only" aria-label="انتظر اكتمال رفع الصورة" />}{error && <p role="alert" className="text-xs font-normal text-red-700">{error}</p>}</div>;
}
