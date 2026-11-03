/** Public product identifiers and prices only. Never send checkout contact fields. */
export type TrackingItem = { id: string; quantity: number; price: number };
export type ShopEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
export type TrackingData = { items?: TrackingItem[]; value?: number; orderId?: string };
type QueuedFunction = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; loaded: boolean; version: string; push?: QueuedFunction };
type TikTokQueue = unknown[][] & { [key: string]: unknown };
type TrackingWindow = Window & { fbq?: QueuedFunction; _fbq?: QueuedFunction; ttq?: TikTokQueue; TiktokAnalyticsObject?: string };
let config = { meta: "", tiktok: "" };
let allowed = false;
let lastView = "";
let lastCheckout = "";
const initializedMeta = new Set<string>();
const initializedTikTok = new Set<string>();
let debugEnabled = false;
const debugEvents: { event: string; status: string; at: string }[] = [];
const failedScripts = new Set<string>();
export function setMarketingDebug(enabled: boolean) { debugEnabled = enabled; }
function debugEvent(event: string, status: string) {
  if (!debugEnabled) return;
  debugEvents.unshift({ event, status, at: new Date().toLocaleTimeString("ar-EG") });
  debugEvents.splice(12);
}
export function getMarketingDiagnostics() {
  const w = window as TrackingWindow;
  const requests = performance.getEntriesByType("resource").flatMap(entry => {
    try { const url = new URL(entry.name); return /(^|\.)facebook\.com$/.test(url.hostname) && url.pathname.replace(/\/$/, "") === "/tr" ? [{ pixel: url.searchParams.get("id"), event: url.searchParams.get("ev") }] : []; } catch { return []; }
  }).slice(-8).reverse();
  return { allowed, meta: config.meta, scriptFailed: failedScripts.has("auraic-meta-sdk"), sdkReady: typeof w.fbq?.callMethod === "function", scriptPresent: !!document.getElementById("auraic-meta-sdk"), events: [...debugEvents], requests };
}


export function pixelPayload(data: TrackingData) {
  const items = (data.items || []).filter(i => /^[A-Za-z0-9_-]{1,100}$/.test(i.id) && Number.isFinite(i.price) && i.price >= 0 && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20).slice(0, 20);
  const value = data.value ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const common = { currency: "EGP", ...(Number.isFinite(value) && value >= 0 ? { value: Math.round(value * 100) / 100 } : {}) };
  return {
    meta: { ...common, content_type: "product", content_ids: items.map(i => i.id), contents: items.map(i => ({ id: i.id, quantity: i.quantity, item_price: i.price })), num_items: items.reduce((n, i) => n + i.quantity, 0) },
    tiktok: { ...common, content_type: "product", contents: items.map(i => ({ content_id: i.id, quantity: i.quantity, price: i.price })) },
  };
}
function script(src: string, id: string) {
  if (document.getElementById(id)) return;
  const element = document.createElement("script"); element.id = id; element.async = true; element.src = src; element.onerror = () => { failedScripts.add(id); }; document.head.appendChild(element);
}
function deferTikTok(queue: TikTokQueue, name: string) {
  queue[name] = (...args: unknown[]) => queue.push([name, ...args]);
}
export function enableMarketing(meta: string, tiktok: string) {
  config = { meta, tiktok }; allowed = true;
  const w = window as TrackingWindow;
  if (meta) {
    if (!w.fbq) {
      const fn = function (...args: unknown[]) { if (fn.callMethod) fn.callMethod(...args); else fn.queue.push(args); } as QueuedFunction;
      fn.queue = []; fn.push = fn; fn.loaded = true; fn.version = "2.0"; w.fbq = fn; w._fbq = fn;
      script("https://connect.facebook.net/en_US/fbevents.js", "auraic-meta-sdk");
    }
    if (!initializedMeta.has(meta)) { w.fbq("init", meta); initializedMeta.add(meta); }
    w.fbq("consent", "grant");
  }
  if (tiktok) {
    if (!w.ttq) {
      w.TiktokAnalyticsObject = "ttq";
      const queue = [] as unknown as TikTokQueue;
      const methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      queue.methods = methods;
      for (const name of methods) deferTikTok(queue, name);
      queue._i = {}; queue._t = {}; queue._o = {};
      queue.instance = (id: string) => {
        const instances = queue._i as Record<string, TikTokQueue>;
        const instance = instances[id] ||= [] as unknown as TikTokQueue;
        for (const name of methods) if (!instance[name]) deferTikTok(instance, name);
        return instance;
      };
      queue.load = (id: string) => {
        const instances = queue._i as Record<string, TikTokQueue>;
        const instance = instances[id] ||= [] as unknown as TikTokQueue;
        instance._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
        (queue._t as Record<string, number>)[id] = Date.now();
        (queue._o as Record<string, object>)[id] = {};
        script(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`, `auraic-tiktok-${id}`);
      };
      w.ttq = queue;
    }
    if (!initializedTikTok.has(tiktok)) { (w.ttq.load as (id: string) => void)(tiktok); initializedTikTok.add(tiktok); }
    (w.ttq.grantConsent as () => void)?.();
  }
}
export function disableMarketing() {
  allowed = false;
  const w = window as TrackingWindow;
  try { w.fbq?.("consent", "revoke"); } catch { /* SDK errors never affect shopping. */ }
  try { (w.ttq?.revokeConsent as (() => void) | undefined)?.(); } catch { /* SDK errors never affect shopping. */ }
}
export function trackPageView() {
  if (!allowed) { debugEvent("PageView", "لم يُرسل: لا توجد موافقة"); return; }
  lastView = ""; lastCheckout = "";
  const w = window as TrackingWindow;
  try { if (config.meta) { w.fbq?.("trackSingle", config.meta, "PageView"); debugEvent("PageView", w.fbq?.callMethod ? "استُدعي سكربت ميتا" : "في انتظار تحميل سكربت ميتا"); } } catch { debugEvent("Meta", "فشل استدعاء سكربت ميتا"); }
  try { if (config.tiktok) { const instance = (w.ttq?.instance as ((id: string) => TikTokQueue) | undefined)?.(config.tiktok); (instance?.page as (() => void) | undefined)?.(); } } catch { /* best effort */ }
}
export function trackShopEvent(event: ShopEvent, data: TrackingData = {}) {
  if (typeof window === "undefined") return;
  if (!allowed) { debugEvent(event, "لم يُرسل: لا توجد موافقة"); return; }
  if (event === "AddToCart" && !data.items?.some(i => i.quantity > 0)) return;
  if (event === "ViewContent") { const key = JSON.stringify(data.items); if (lastView === key) return; lastView = key || "view"; }
  if (event === "InitiateCheckout") { const key = JSON.stringify(data.items); if (lastCheckout === key) return; lastCheckout = key || "checkout"; }
  if (event === "Purchase" && data.orderId) {
    try { const key = `auraic-purchase:${config.meta}:${config.tiktok}:${data.orderId}`; if (sessionStorage.getItem(key)) { debugEvent(event, "لم يتكرر: الطلب مسجل في هذه الجلسة"); return; } sessionStorage.setItem(key, "1"); } catch { /* storage may be disabled */ }
  }
  const w = window as TrackingWindow; const payload = pixelPayload(data);
  try { if (config.meta) { w.fbq?.("trackSingle", config.meta, event, payload.meta); debugEvent(event, w.fbq?.callMethod ? "استُدعي سكربت ميتا" : "في انتظار تحميل سكربت ميتا"); } } catch { debugEvent("Meta", "فشل استدعاء سكربت ميتا"); }
  try { if (config.tiktok) { const instance = (w.ttq?.instance as ((id: string) => TikTokQueue) | undefined)?.(config.tiktok); (instance?.track as ((...args: unknown[]) => void) | undefined)?.(event, payload.tiktok); } } catch { /* best effort */ }
}
