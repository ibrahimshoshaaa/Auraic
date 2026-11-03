"use client";
import "./marketing.css";
import { PixelDiagnostics } from "./PixelDiagnostics";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { disableMarketing, enableMarketing, trackPageView } from "@/lib/storefront/tracking";
export function Marketing({ meta, tiktok }: { meta: string; tiktok: string }) {
  const recorded = useRef(""); const advertised = useRef("");
  const path = usePathname(); const [consent, setConsent] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem("auraic-marketing"); const valid = saved === "yes" || saved === "no"; setConsent(valid ? saved : null); setBannerOpen(!valid); }
    catch { setBannerOpen(true); }
    const reopen = () => setBannerOpen(true);
    window.addEventListener("auraic:advertising-preferences", reopen);
    return () => window.removeEventListener("auraic:advertising-preferences", reopen);
  }, []);
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
    if (consent !== "yes") { disableMarketing(); advertised.current = ""; return; }
    try { enableMarketing(meta, tiktok); } catch { return; }
    const key = `${meta}:${tiktok}:${path}`;
    if (advertised.current === key) return;
    advertised.current = key; trackPageView();
    window.dispatchEvent(new Event("auraic:marketing-ready"));
  }, [path, consent, meta, tiktok]);
  function choose(value: "yes" | "no") { try { localStorage.setItem("auraic-marketing", value); } catch { /* session-only consent */ } setConsent(value); setBannerOpen(false); }
  return <><PixelDiagnostics meta={meta}/>{(meta || tiktok) && bannerOpen ? <aside className="shop-cookie-banner" aria-label="Advertising cookies">
    <div><h2>Cookie preferences</h2><p>Allow advertising cookies to help us measure our campaigns? You can change your choice anytime using Cookie preferences in the footer.</p></div>
    <div className="shop-cookie-actions"><button type="button" onClick={() => choose("yes")}>Allow</button><button type="button" onClick={() => choose("no")}>Decline</button></div>
  </aside> : null}</>;
}
