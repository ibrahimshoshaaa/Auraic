export const TRAFFIC_TIME_ZONE = "Africa/Cairo";
export const TRAFFIC_RETENTION_DAYS = 90;
const DAY = 86_400_000;
export function trafficRange(input: unknown, now = new Date()) {
  const days = [1, 7, 30, 90].includes(Number(input)) ? Number(input) : 7;
  return { days, to: now, from: new Date(now.getTime() - days * DAY), previousFrom: new Date(now.getTime() - days * 2 * DAY) };
}
export type TrafficRange = ReturnType<typeof trafficRange>;
export type TrafficPoint = { key: string; label: string; shortLabel: string; visits: number; views: number };
export type BucketRow = { bucket: string; visits: bigint | number; views: bigint | number };
const dateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TRAFFIC_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export function trafficPoints(range: TrafficRange, rows: BucketRow[]): TrafficPoint[] {
  const values = new Map(rows.map(row => [row.bucket, row]));
  const hourly = range.days === 1;
  const start = hourly ? new Date(Math.floor(range.from.getTime() / 3_600_000) * 3_600_000) : new Date(`${dateKey(range.from)}T12:00:00Z`);
  const end = hourly ? range.to : new Date(`${dateKey(range.to)}T12:00:00Z`);
  const points: TrafficPoint[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += hourly ? 3_600_000 : DAY) {
    const date = new Date(time);
    const key = hourly ? date.toISOString().slice(0, 13) : date.toISOString().slice(0, 10);
    const row = values.get(key);
    points.push({ key, visits: Number(row?.visits ?? 0), views: Number(row?.views ?? 0),
      label: new Intl.DateTimeFormat("ar-EG", { timeZone: TRAFFIC_TIME_ZONE, day: "numeric", month: "short", ...(hourly ? { hour: "numeric", minute: "2-digit" } : {}) }).format(date),
      shortLabel: new Intl.DateTimeFormat("ar-EG", { timeZone: TRAFFIC_TIME_ZONE, ...(hourly ? { hour: "numeric" } : { day: "numeric", month: "numeric" }) }).format(date) });
  }
  return points;
}
export function percentage(part: number, total: number) { return total > 0 ? Math.round(part / total * 1000) / 10 : 0; }
export function trafficChange(current: number, previous: number, comparable: boolean) {
  if (!comparable) return null;
  if (!previous) return current ? { kind: "new" as const, percent: null } : { kind: "flat" as const, percent: 0 };
  const percent = Math.round((current - previous) / previous * 1000) / 10;
  return { kind: percent > 0 ? "up" as const : percent < 0 ? "down" as const : "flat" as const, percent: Math.abs(percent) };
}
export function trafficComparable(range: TrafficRange, collectionStarted: Date | null) {
  // Lack of a baseline is unknown history, never a zero-traffic period.
  return !!collectionStarted && range.previousFrom >= collectionStarted && range.previousFrom.getTime() >= range.to.getTime() - TRAFFIC_RETENTION_DAYS * DAY;
}
export function pageTitle(path: string) {
  const titles: Record<string, string> = { "/": "الرئيسية", "/products": "المنتجات", "/samples": "العينات", "/cart": "سلة التسوق", "/checkout": "إتمام الطلب", "/favorites": "المفضلة", "/contact": "تواصل معنا", "/shipping": "سياسة الشحن", "/returns": "سياسة الاسترجاع", "/policies": "السياسات" };
  return titles[path] ?? (path.startsWith("/products/") ? "صفحة منتج" : "صفحة المتجر");
}
