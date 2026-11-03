"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { disableMarketing, enableMarketing, trackPageView } from "@/lib/storefront/tracking";
export function Marketing({ meta, tiktok }: { meta: string; tiktok: string }) {
  const recorded = useRef(""); const advertised = useRef("");
  const path = usePathname(); const [consent, setConsent] = useState<string | null>(null);
  useEffect(() => { try { const saved = localStorage.getItem("auraic-marketing"); setConsent(saved === "yes" || saved === "no" ? saved : null); } catch { /* ask for consent */ } }, []);
  useEffect(() => {
    if (recorded.current === path) return;
    recorded.current = path;
    try {
      let session = sessionStorage.getItem("auraic-visit");
      if (!session) { session = crypto.randomUUID(); sessionStorage.setItem("auraic-visit", session); }
      void fetch("/api/storefront/traffic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: crypto.randomUUID(), session, path }), keepalive: true }).catch(() => {});
    } catch { /* analytics never blocks shopping */ }
  }, [path]);
  useEffect(() => {
    if (consent !== "yes") { disableMarketing(); return; }
    try { enableMarketing(meta, tiktok); } catch { return; }
    const key = `${meta}:${tiktok}:${path}`;
    if (advertised.current === key) return;
    advertised.current = key; trackPageView();
    window.dispatchEvent(new Event("auraic:marketing-ready"));
  }, [path, consent, meta, tiktok]);
  function choose(value: "yes" | "no") { try { localStorage.setItem("auraic-marketing", value); } catch { /* session-only consent */ } setConsent(value); }
  function reset() { disableMarketing(); advertised.current = ""; try { localStorage.removeItem("auraic-marketing"); } catch { /* session-only consent */ } setConsent(null); }
  if (!(meta || tiktok)) return null;
  return <aside className="rounded-xl border bg-white p-4 text-sm text-slate-900" aria-label="Advertising preferences">{consent === null ? <><p>Allow advertising cookies to help us measure our campaigns? You can change your choice here anytime.</p><button type="button" onClick={() => choose("yes")} className="m-2 rounded border p-2">Allow</button><button type="button" onClick={() => choose("no")} className="m-2 rounded border p-2">Decline</button></> : <button type="button" onClick={reset}>Advertising preferences</button>}</aside>;
}
