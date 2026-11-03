"use client";
import { useState } from "react";
import type { TrafficPoint } from "@/lib/storefront/traffic-report";
import styles from "./traffic-chart.module.css";
export function TrafficChart({ points }: { points: TrafficPoint[] }) {
  const [metric, setMetric] = useState<"visits" | "views">("visits");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = points.find(point => point.key === selectedKey) ?? points.at(-1);
  const max = Math.max(1, ...points.map(point => point[metric]));
  const number = (n: number) => n.toLocaleString("ar-EG");
  return <div className={styles.root}>
    <div className={styles.controls} aria-label="بيانات الرسم"><button type="button" aria-pressed={metric === "visits"} onClick={() => setMetric("visits")}>الزيارات</button><button type="button" aria-pressed={metric === "views"} onClick={() => setMetric("views")}>المشاهدات</button></div>
    <p className={styles.hint}>اضغط على العمود لعرض أرقامه{points.length > 12 ? " · اسحب أفقيًا لباقي الفترة" : ""}</p>
    <div className={styles.scroll} dir="ltr"><div className={styles.chart} style={{ gridTemplateColumns: `repeat(${points.length}, minmax(28px, 1fr))` }}>
      {points.map(point => <button type="button" key={point.key} className={styles.column} aria-pressed={selected?.key === point.key} aria-label={`${point.label}: ${number(point.visits)} زيارة، ${number(point.views)} مشاهدة`} onClick={() => setSelectedKey(point.key)} onFocus={() => setSelectedKey(point.key)}><span className={styles.barArea}><span className={styles.bar} style={{ height: `${point[metric] / max * 100}%`, minHeight: point[metric] ? 4 : 2, opacity: point[metric] ? 1 : 0.25 }} /></span><span className={styles.label}>{point.shortLabel}</span></button>)}
    </div></div>
    {selected && <div className={styles.selection} aria-live="polite"><strong>{selected.label}</strong><span>{number(selected.visits)} زيارة <b>·</b> {number(selected.views)} مشاهدة</span></div>}
  </div>;
}
