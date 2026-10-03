"use client";
import { useState } from "react";
export function VideoUpload({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function upload(file: File) {
    if (!/\.(mp4|webm)$/i.test(file.name) || !file.size || file.size > 20 * 1024 * 1024) { setError("اختر فيديو MP4 أو WebM حتى 20 ميجابايت"); return; }
    setBusy(true); setError("");
    try {
      const signed = await fetch("/api/admin/storefront/video-signature", { method: "POST" }); const data = await signed.json(); if (!signed.ok) throw new Error(data.error || "تعذر بدء الرفع");
      const form = new FormData(); form.set("file", file); for (const [key, value] of Object.entries(data.data.fields)) form.set(key, String(value));
      const response = await fetch(data.data.url, { method: "POST", body: form, signal: AbortSignal.timeout(180000) }); const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "تعذر رفع الفيديو"); setUrl(result.secure_url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر رفع الفيديو"); } finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-xl border p-4"><label className="block text-sm font-semibold">فيديو الهيرو<input name="heroVideo" aria-label="رابط فيديو الهيرو" type="url" value={url} onChange={event => setUrl(event.target.value)} readOnly={busy} placeholder="رابط HTTPS أو ارفع من جهازك" className="mt-2 w-full rounded-xl border px-4 py-3" dir="ltr" /></label><label className="inline-flex cursor-pointer rounded-xl bg-[#191735] px-4 py-3 text-sm font-semibold text-white">{busy ? "جارٍ رفع الفيديو…" : "↑ رفع فيديو من الجهاز"}<input className="sr-only" type="file" aria-label="رفع فيديو الهيرو" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }}/></label>{url && <button type="button" disabled={busy} onClick={() => setUrl("")} className="mx-3 text-sm text-red-700">حذف الفيديو</button>}<p className="text-xs text-slate-500">MP4 أو WebM حتى 20 ميجابايت. احفظ تعديلات الموقع بعد الرفع.</p>{url.startsWith("https://") && <video src={url} controls preload="metadata" className="max-h-60 w-full rounded-xl"/>}{busy && <input required readOnly value="" aria-label="انتظر اكتمال رفع الفيديو" className="sr-only"/>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
