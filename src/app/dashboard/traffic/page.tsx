import Link from "next/link";
import styles from "./traffic.module.css";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
export default async function Traffic({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
 const session = await requireAuth(); if (!can(session.role, "reports.read")) throw new Error("Forbidden");
 const query = await searchParams; const days = [1,7,30,90].includes(Number(query.days)) ? Number(query.days) : 7;
 const where = { storeId: session.storeId, createdAt: { gte: new Date(Date.now()-days*86400000) } };
 let views = 0; let visits = 0; let pages: { path: string; _count: { _all: number } }[] = []; let unavailable = false;
 try { [views, visits, pages] = await Promise.all([db.storeVisit.count({ where }), db.$queryRaw<{ total: bigint }[]>`SELECT COUNT(DISTINCT "session") AS total FROM "StoreVisit" WHERE "storeId" = ${session.storeId} AND "createdAt" >= ${where.createdAt.gte}`.then(rows => Number(rows[0].total)), db.storeVisit.groupBy({ by: ["path"], where, _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 15 })]); } catch { unavailable = true; }
 const format = (value: number) => value.toLocaleString("ar-EG");
 const titles: Record<string, string> = { "/": "الرئيسية", "/products": "المنتجات", "/samples": "العينات", "/cart": "سلة التسوق", "/checkout": "إتمام الطلب", "/favorites": "المفضلة", "/contact": "تواصل معنا", "/shipping": "سياسة الشحن", "/returns": "سياسة الاسترجاع", "/policies": "السياسات" };
 return <main className={styles.page} dir="rtl">
  <header className={styles.header}><span className={styles.eyebrow}>إحصائيات المتجر</span><h1>زيارات الموقع</h1><p>تابع حركة متجرك والصفحات التي يهتم بها زوارك.</p></header>
  <nav className={styles.periods} aria-label="الفترة الزمنية">{[[1,"٢٤ ساعة"],[7,"٧ أيام"],[30,"٣٠ يومًا"],[90,"٩٠ يومًا"]].map(([n,label]) => <Link key={n} aria-current={n===days ? "page" : undefined} href={`?days=${n}`}>{label}</Link>)}</nav>
  {unavailable ? <div className={styles.empty} role="alert"><h2>الإحصائيات غير متاحة الآن</h2><p>جرّب إعادة تحميل الصفحة بعد قليل.</p></div> : <>
   <section className={styles.metrics} aria-label="ملخص الزيارات"><article className={styles.metric}><span>الزيارات</span><strong>{format(visits)}</strong><small>جلسات التصفح</small></article><article className={styles.metric}><span>مشاهدات الصفحات</span><strong>{format(views)}</strong><small>إجمالي الصفحات المفتوحة</small></article></section>
   <section className={styles.panel}><div className={styles.panelHeading}><h2>الصفحات الأكثر مشاهدة</h2><span>آخر {format(days)} يوم</span></div>
    {pages.length ? <ol className={styles.pages}>{pages.map((p,index) => <li key={p.path}><span className={styles.rank}>{format(index+1)}</span><div className={styles.pageInfo}><div className={styles.pageTop}><strong>{titles[p.path] || (p.path.startsWith("/products/") ? "صفحة منتج" : "صفحة المتجر")}</strong><span>{format(p._count._all)} <small>مشاهدة</small></span></div><span className={styles.path} dir="ltr">{p.path}</span><div className={styles.track}><span style={{width:`${Math.max(2, p._count._all/Math.max(views,1)*100)}%`}} /></div></div></li>)}</ol> : <div className={styles.empty}><h3>أول زيارة تبدأ من هنا</h3><p>ستظهر الأرقام تلقائيًا عندما يزور أحد متجرك.</p></div>}
   </section>
  </>}
  <details className={styles.notes}><summary>كيف تُحسب الزيارات؟</summary><p>الأرقام تقريبية وتبدأ من تفعيل الميزة. الزيارة جلسة تصفح؛ فتح تبويب جديد قد يُحسب زيارة أخرى، وليست عدد أشخاص فريدين. تُحفظ بيانات آخر ٩٠ يومًا. قد تؤثر أدوات الحظر أو تعطيل JavaScript على الأرقام، ولا تُحسب صفحات لوحة الإدارة.</p></details>
 </main>;
}
