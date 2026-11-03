"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
type Pixel = { page: () => void; track: (...args: unknown[]) => void; load: (id: string) => void };
declare global { interface Window { fbq?: (...args: unknown[]) => void; ttq?: Pixel; } }
export function Marketing({ meta, tiktok }: { meta: string; tiktok: string }) {
 const recorded = useRef("");
 const path = usePathname(); const [consent, setConsent] = useState<string | null>(null);
 useEffect(() => { try { setConsent(localStorage.getItem("auraic-marketing")); } catch { /* consent remains unset */ } }, []);
 useEffect(() => {
  if (consent !== "yes") return;
  if (meta && !window.fbq) {
   const q: unknown[][] = []; const fn = (...args: unknown[]) => { const f = window.fbq as typeof fn & { callMethod?: (...a: unknown[]) => void }; if (f.callMethod) f.callMethod(...args); else q.push(args); };
   window.fbq = Object.assign(fn, { queue: q, push: fn, loaded: true, version: "2.0" });
   const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(s); window.fbq("init", meta);
  }
  if (tiktok && !window.ttq) {
   const q: unknown[][] = []; const sdk = q as unknown as Pixel & Record<string, unknown>; window.ttq = sdk;
   for (const m of ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"]) sdk[m] = (...a: unknown[]) => q.push([m, ...a]);
   sdk._i = { [tiktok]: [] }; sdk._t = { [tiktok]: Date.now() }; sdk._o = { [tiktok]: {} };
   const s = document.createElement("script"); s.async = true; s.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(tiktok)}&lib=ttq`; document.head.appendChild(s);
  }
 }, [consent, meta, tiktok]);
 useEffect(() => {
  // Session IDs are random; URLs exclude query strings and customer details.
  try { if (recorded.current !== path) { recorded.current = path; if (!sessionStorage.getItem("auraic-visit")) sessionStorage.setItem("auraic-visit", crypto.randomUUID()); void fetch("/api/storefront/traffic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: crypto.randomUUID(), session: sessionStorage.getItem("auraic-visit"), path }), keepalive: true }).catch(() => {}); } } catch { /* analytics must never block shopping */ }
  if (consent === "yes") { if (meta) window.fbq?.("track", "PageView"); if (tiktok) window.ttq?.page(); }
 }, [path, consent, meta, tiktok]);
 useEffect(() => {
  function receive(e: Event) { if (consent !== "yes") return; const { event, data } = (e as CustomEvent).detail; if (meta) window.fbq?.("track", event, data); if (tiktok) window.ttq?.track(event, { ...data, ...(Array.isArray(data.content_ids) ? { contents: data.content_ids.map((id: string) => ({ content_id: id, content_type: "product" })) } : {}) }); }
  window.addEventListener("auraic:track", receive); return () => window.removeEventListener("auraic:track", receive);
 }, [consent, meta, tiktok]);
 function choose(value: string) { try { localStorage.setItem("auraic-marketing", value); } catch {} setConsent(value); }
 if (!(meta || tiktok)) return null;
 return <aside className="rounded-xl border bg-white p-4 text-sm text-slate-900" aria-label="Marketing preferences">{consent === null ? <><p>Allow advertising cookies to help us measure our campaigns?</p><button type="button" onClick={() => choose("yes")} className="m-2 rounded border p-2">Allow</button><button type="button" onClick={() => choose("no")} className="m-2 rounded border p-2">Decline</button></> : <button type="button" onClick={() => { try { localStorage.removeItem("auraic-marketing"); } catch {} window.location.reload(); }}>Advertising preferences</button>}</aside>;
}
