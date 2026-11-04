import Link from "next/link";
import styles from "./traffic.module.css";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { trafficChange, TRAFFIC_TIME_ZONE } from "@/lib/storefront/traffic-report";
import { getTrafficReport } from "@/services/storefront/traffic-report";
import { TrafficChart } from "@/components/reports/TrafficChart";
export const dynamic = "force-dynamic";
const number = (n: number, digits = 0) => n.toLocaleString("ar-EG", { maximumFractionDigits: digits });
const dateTime = (date: Date) => new Intl.DateTimeFormat("ar-EG", { timeZone: TRAFFIC_TIME_ZONE, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
function Change({ current, previous, comparable }: { current: number; previous: number; comparable: boolean }) {
  const change = trafficChange(current, previous, comparable);
  if (!change) return <small className={styles.pending}>المقارنة متاحة عند اكتمال فترة سابقة محفوظة</small>;
  return <small className={change.kind === "up" || change.kind === "new" ? styles.up : change.kind === "down" ? styles.down : styles.pending}>{change.kind === "new" ? "نشاط جديد؛ الفترة السابقة بلا زيارات" : change.kind === "flat" ? "بدون تغيير عن الفترة السابقة" : `${change.kind === "up" ? "↑ زيادة" : "↓ انخفاض"} ${number(change.percent ?? 0, 1)}٪ عن الفترة السابقة`}</small>;
}
export default async function Traffic({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await requireAuth(); if (!can(session, "traffic.read")) throw new Error("Forbidden");
  const query = await searchParams;
  let report: Awaited<ReturnType<typeof getTrafficReport>> | null = null;
  try { report = await getTrafficReport(session.storeId, query.days); } catch { /* Report failures never affect the storefront. */ }
  const days = report?.range.days ?? ([1, 7, 30, 90].includes(Number(query.days)) ? Number(query.days) : 7);
  return <main className={styles.page} dir="rtl">
    <header className={styles.header}><div><span className={styles.eyebrow}>إحصائيات المتجر</span><h1>زيارات الموقع</h1><p>تابع حركة زوارك وما يهتمون به داخل المتجر.</p></div>{report && <div className={styles.active}><span aria-hidden="true"/><strong>{number(report.active)}</strong> جلسة خلال آخر ١٥ دقيقة</div>}</header>
    <div className={styles.toolbar}><nav className={styles.periods} aria-label="الفترة الزمنية">{[[1,"٢٤ ساعة"],[7,"٧ أيام"],[30,"٣٠ يومًا"],[90,"٩٠ يومًا"]].map(([n,label]) => <Link key={n} aria-current={n === days ? "page" : undefined} href={`?days=${n}`}>{label}</Link>)}</nav><a className={styles.refresh} href={`?days=${days}`}>تحديث الأرقام ↻</a></div>
    {report ? <>
      <p className={styles.range}>{dateTime(report.range.from)} — {dateTime(report.range.to)} <span>بتوقيت القاهرة</span></p>
      <section className={styles.metrics} aria-label="ملخص الزيارات">
        <article className={styles.metric}><span>الزيارات</span><strong>{number(report.visits)}</strong><small>جلسات تصفح خلال الفترة</small><Change current={report.visits} previous={report.previousVisits} comparable={report.comparable}/></article>
        <article className={styles.metric}><span>مشاهدات الصفحات</span><strong>{number(report.views)}</strong><small>كل مرة تفتح فيها صفحة</small><Change current={report.views} previous={report.previousViews} comparable={report.comparable}/></article>
        <article className={styles.metric}><span>صفحات لكل زيارة</span><strong>{number(report.averageDepth, 1)}</strong><small>متوسط عمق التصفح</small></article>
        <article className={styles.metric}><span>الوصول لإتمام الطلب</span><strong>{number(report.checkoutShare, 1)}<em>٪</em></strong><small>نسبة الجلسات التي فتحت صفحة إتمام الطلب</small></article>
      </section>
      <section className={styles.panel}><div className={styles.panelHeading}><h2>{days === 1 ? "حركة الزيارات بالساعات" : "حركة الزيارات يومًا بيوم"}</h2><span>بتوقيت القاهرة</span></div><TrafficChart points={report.points}/><details className={styles.chartData}><summary>عرض الأرقام في جدول</summary><div className={styles.tableScroll}><table><caption>تفاصيل الزيارات والمشاهدات حسب الوقت</caption><thead><tr><th scope="col">{days === 1 ? "الساعة" : "اليوم"}</th><th scope="col">الزيارات</th><th scope="col">المشاهدات</th></tr></thead><tbody>{report.points.map(point => <tr key={point.key}><th scope="row">{point.label}</th><td>{number(point.visits)}</td><td>{number(point.views)}</td></tr>)}</tbody></table></div></details></section>
      <div className={styles.twoColumns}>
        <section className={styles.panel}><div className={styles.panelHeading}><h2>الوصول لصفحات التسوق</h2><span>جلسات التصفح</span></div><div className={styles.stages}>{report.stages.map(stage => <div key={stage.label}><div><span>{stage.label}</span><strong>{number(stage.count)} <small>جلسة</small></strong></div><div className={styles.track}><span style={{ width: `${report.visits ? stage.count / report.visits * 100 : 0}%` }}/></div></div>)}</div><p className={styles.caption}>الخطوات ليست مسارًا إجباريًا؛ «اشتري الآن» قد يتجاوز صفحة السلة. فتح إتمام الطلب لا يعني تأكيد الطلب.</p></section>
        <section className={styles.panel}><div className={styles.panelHeading}><h2>لمحة عن التصفح</h2></div><dl className={styles.insights}><div><dt>جلسات بصفحة واحدة</dt><dd>{number(report.singlePage)} <small>من {number(report.visits)} جلسة</small></dd></div><div><dt>{days === 1 ? "الساعة الأعلى في المشاهدات" : "اليوم الأعلى في المشاهدات"}</dt><dd>{report.peak ? report.peak.label : "لا توجد بيانات بعد"}{report.peak && <small>{number(report.peak.views)} مشاهدة</small>}</dd></div><div><dt>آخر زيارة في الفترة</dt><dd>{report.lastVisit ? dateTime(report.lastVisit) : "لا توجد زيارات"}</dd></div></dl></section>
      </div>
      <section className={styles.panel}><div className={styles.panelHeading}><h2>الصفحات الأكثر مشاهدة</h2><span>أعلى ١٥ صفحة</span></div>{report.pages.length ? <ol className={styles.pages}>{report.pages.map((page,index) => <li key={page.path}><span className={styles.rank}>{number(index + 1)}</span><div className={styles.pageInfo}><div className={styles.pageTop}><Link href={page.path} target="_blank" rel="noopener noreferrer">{page.label} <span aria-hidden="true">↗</span></Link><strong>{number(page.views)} <small>مشاهدة</small></strong></div><span className={styles.path} dir="ltr">{page.path}</span><div className={styles.pageMeta}><span>{number(page.share, 1)}٪ من المشاهدات</span><span>{number(page.visits)} جلسة</span><span>آخر فتح: {dateTime(page.lastSeen)}</span></div><div className={styles.track}><span style={{ width: `${page.share}%` }}/></div></div></li>)}</ol> : <div className={styles.empty}><h3>أول زيارة تبدأ من هنا</h3><p>ستظهر الأرقام تلقائيًا عندما يزور أحد متجرك.</p></div>}</section>
      <p className={styles.updated}>آخر تحديث: {dateTime(report.range.to)} · {report.collectionStarted ? `بدأ التسجيل: ${dateTime(report.collectionStarted)}` : "التقرير يعتمد على البيانات المحفوظة"}</p>
    </> : <div className={styles.empty} role="alert"><h2>الإحصائيات غير متاحة الآن</h2><p>جرّب إعادة تحميل الصفحة بعد قليل.</p></div>}
    <details className={styles.notes}><summary>كيف تُحسب هذه الأرقام؟</summary><p>الزيارة جلسة تصفح، وليست شخصًا فريدًا؛ فتح تبويب جديد قد يبدأ جلسة أخرى. قد تظهر الجلسة نفسها في أكثر من يوم، لذلك قد يختلف مجموع أعمدة الزيارات عن إجمالي الفترة. المشاهدات تشمل إعادة فتح الصفحة.</p><p>الفترات متحركة وتنتهي عند وقت تحديث التقرير؛ أول وآخر عمود قد يغطيان جزءًا من يوم أو ساعة. المقارنة مع فترة سابقة مساوية في المدة تظهر فقط عندما تكون الفترة كاملة بعد بدء التسجيل وضمن آخر ٩٠ يومًا المحفوظة.</p><p>«جلسة بصفحة واحدة» ليست قياسًا لمدة البقاء أو معدل الارتداد. الوصول لإتمام الطلب ليس تأكيد شراء. لا تُحسب صفحات لوحة الإدارة. أدوات الحظر أو تعطيل JavaScript قد تؤثر على العد.</p><p>لا يجمع هذا التقرير حاليًا مصدر الزيارة أو نوع الجهاز أو البلد أو مدة التصفح، ولا يمكن استرجاع هذه التفاصيل للزيارات القديمة.</p></details>
  </main>;
}
