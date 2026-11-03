"use client";
import { useEffect, useRef, useState } from "react";
import { getMarketingDiagnostics, setMarketingDebug } from "@/lib/storefront/tracking";
import styles from "./pixel-diagnostics.module.css";
type Snapshot = ReturnType<typeof getMarketingDiagnostics>;
export function PixelDiagnostics({ meta }: { meta: string }) {
  const timerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => {
    let enabled = new URLSearchParams(window.location.search).get("pixel_debug") === "1";
    try { enabled ||= sessionStorage.getItem("auraic-pixel-debug") === "1"; if (enabled) sessionStorage.setItem("auraic-pixel-debug", "1"); } catch { /* session storage is optional */ }
    if (!enabled) return;
    setMarketingDebug(true); setOpen(true);
    const refresh = () => { try { setSnapshot(getMarketingDiagnostics()); } catch { /* diagnostics never interrupt shopping */ } };
    refresh(); const timer = window.setInterval(refresh, 1000); timerRef.current = timer;
    return () => { clearInterval(timer); setMarketingDebug(false); };
  }, []);
  function close() { window.clearInterval(timerRef.current); setOpen(false); setMarketingDebug(false); try { sessionStorage.removeItem("auraic-pixel-debug"); } catch { /* optional */ } }
  if (!open || !snapshot) return null;
  return <details className={styles.panel} dir="rtl" open><summary>فحص Meta Pixel</summary><button className={styles.close} type="button" onClick={close} aria-label="إغلاق فحص البيكسل">×</button><div className={styles.body}>
   <p className={styles.notice}>هذا فحص على جهازك، وليس تأكيد استلام من ميتا. لا يرسل أحداثًا تجريبية.</p>
   <dl><div><dt>رقم البيكسل</dt><dd dir="ltr">{meta || "غير مضبوط"}</dd></div><div><dt>موافقة الإعلانات</dt><dd>{snapshot.allowed ? "موافق" : "غير موافق / لم يختر بعد"}</dd></div><div><dt>سكربت ميتا</dt><dd>{snapshot.scriptFailed ? "فشل التحميل: قد يكون محظورًا أو الاتصال متعذرًا" : snapshot.sdkReady ? "تم تحميله وتشغيله" : snapshot.scriptPresent ? "جارٍ التحميل؛ استمرار الانتظار يحتاج فحص الاتصال" : "لم يبدأ التحميل"}</dd></div></dl>
   {!snapshot.allowed && <button type="button" className={styles.preferences} onClick={() => window.dispatchEvent(new Event("auraic:advertising-preferences"))}>فتح اختيار الكوكيز</button>}
   <h3>آخر استدعاءات الموقع</h3>{snapshot.events.length ? <ul>{snapshot.events.map((item,index) => <li key={index}><b dir="ltr">{item.event}</b><span>{item.status}</span><small>{item.at}</small></li>)}</ul> : <p>تنقّل بين الصفحات لتسجيل الأحداث هنا.</p>}
   <h3>طلبات ميتا الظاهرة للمتصفح</h3>{snapshot.requests.length ? <ul>{snapshot.requests.map((item,index) => <li key={index}><b dir="ltr">{item.event || "حدث"}</b><small dir="ltr">{item.pixel}</small></li>)}</ul> : <p>لا تظهر طلبات حتى الآن. هذه القائمة وحدها لا تثبت المنع أو الاستلام.</p>}
  </div></details>;
}
