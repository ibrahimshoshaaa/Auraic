import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { getBusinessReport } from "@/services/report.service";
import { RangeFilter } from "@/components/reports/RangeFilter";
import { SalesBars } from "@/components/reports/SalesBars";

type Params = { period?: string; from?: string; to?: string };
const money = (value: number, currency: string) => `${Number(value).toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireAuth();
  if (!can(session.role, "dashboard.read")) throw new Error("Forbidden");
  const query = await searchParams;
  const report = await getBusinessReport(session.storeId, { period: query.period, from: query.from, to: query.to });
  const currency = report.currency;
  const cards = [
    { label: "صافي الربح", value: report.profit.profit === null ? "تكلفة غير مكتملة" : money(report.profit.profit, currency), mark: "◈", hint: "سعر البيع بعد الخصم والاسترداد − تكلفة الوصفة؛ قبل المصروفات التشغيلية" },
    { label: "نسبة الربح", value: report.profit.margin === null ? "—" : `${report.profit.margin}%`, mark: "%", hint: "صافي الربح ÷ قيمة المنتجات المباعة × ١٠٠" },
    { label: "الطلبات", value: String(report.sales.orders), mark: "◫" },
    { label: "الوحدات المباعة", value: String(report.sales.units), mark: "▤" },
    { label: "المرتجعات", value: String(report.returns.count), mark: "↶" },
    { label: "المصروفات", value: money(report.expenses.total, currency), mark: "◇", hint: "تشمل تكلفة المرتجعات" },
    { label: "الدفعات المستلمة من الطلبات اليدوية", value: money(report.cash.received, currency), mark: "●", hint: `ديبوزت ${money(report.cash.deposits, currency)} · باقي الطلبات المسلّمة ${money(report.cash.deliveryBalances, currency)}؛ قبل أي ردّ مبالغ` },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-8 sm:py-7">
      <header className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-xl font-bold tracking-tight text-[#191735] sm:text-3xl">أهلًا بك في Auraic</h1><p className="mt-1 text-xs text-slate-500 sm:text-sm">ملخص شغلك · {report.range.from} – {report.range.to}</p></div><Link href="/dashboard/reports" className="shrink-0 rounded-xl border border-[#deddea] bg-white px-3 py-2 text-xs font-semibold text-[#191735] hover:border-[#191735] sm:text-sm">التقارير ←</Link></header>
      <section aria-label="اختيار الفترة">
        <RangeFilter base="/dashboard" period={report.range.period} from={query.from} to={query.to} />
      </section>
      {report.notes.excludedDifferentCurrencyOrders > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">تم استبعاد {report.notes.excludedDifferentCurrencyOrders} طلب بعملة مختلفة عن {currency} من المبيعات.</p>}
      <section aria-label="إجمالي المبيعات" className="rounded-3xl bg-[#191735] p-5 text-white shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm text-[#e4e1f2] sm:text-base">↗ &nbsp; إجمالي المبيعات</h2><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[#ffe8a1]">{report.range.from} – {report.range.to}</span></div>
        <strong className="mt-5 block text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl" dir="ltr">{money(report.sales.total, currency)}</strong>
        <p className="mt-2 text-xs text-[#e4e1f2]">بعد الخصومات، شامل الشحن؛ قبل ردّ المبالغ</p>
      </section>
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 " aria-label="مؤشرات الأداء">
        {cards.map(card => (
          <div key={card.label} className="min-w-0 rounded-2xl border border-[#e5e4ec] bg-white p-3.5 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-1"><p className="text-xs text-slate-500 sm:text-sm">{card.label}</p><span aria-hidden="true" className="text-lg text-[#625f89]">{card.mark}</span></div>
            <strong className="mt-4 block break-words text-xl font-bold tabular-nums tracking-tight text-[#191735] sm:text-2xl">{card.value}</strong>
            {"hint" in card && <p className="mt-2 text-xs text-slate-400">{card.hint}</p>}
          </div>
        ))}
      </section>
      {(report.profit.incomplete || report.profit.estimated) && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{report.profit.incomplete ? `${report.profit.missingLines} بند بيع بدون تكلفة وصفة مكتملة. راجع تكلفة الخامات والاستهلاك؛ الربح والنسبة لا يظهران حتى تكتمل البيانات.` : "ربح بعض المبيعات القديمة تقديري لعدم تسجيل تكلفة الخامات وقت تجهيزها. المبيعات الجديدة تحفظ تكلفتها وقت التجهيز."}</p>}
      <section aria-label="عائد الإنفاق على السوشيال ميديا" className="rounded-2xl border border-[#e5e4ec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">ROAS · عائد مصاريف السوشيال ميديا</h2><p className="mt-1 text-xs text-slate-500">إجمالي مبيعات الفترة ÷ مجموع مصاريف السوشيال لنفس الفترة</p></div><strong dir="ltr" className="text-3xl font-bold text-[#191735]">{report.roas.ratio === null ? "—" : `${report.roas.ratio}×`}</strong></div>
        <p className="mt-3 text-sm text-slate-600">مصاريف السوشيال: <b>{money(report.roas.spend, currency)}</b> · المبيعات: <b>{money(report.roas.sales, currency)}</b></p>
        <p className="mt-2 text-xs text-slate-500">{report.roas.ratio === null ? "سجّل مصاريف سوشيال ميديا خلال الفترة لعرض النسبة." : `كل ١ ${currency} مصروف يقابله ${report.roas.ratio} ${currency} مبيعات.`} المؤشر يعتمد على كل مبيعات المتجر، بدون تتبع مصدر الإعلان.</p>
        {can(session.role, "expenses.write") && <Link href="/dashboard/expenses?add=1" className="mt-3 inline-block text-sm font-semibold text-[#514b8c] underline">تسجيل مصروف سوشيال ←</Link>}
      </section>
      <section aria-label="عمليات سريعة">
        <h2 className="mb-3 text-lg font-bold text-[#191735]">عمليات سريعة</h2>
        {can(session.role, "orders.write") && <Link href="/dashboard/orders/new" className="mb-3 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#191735] px-4 text-base font-bold text-white hover:bg-[#302d58]"><span className="text-xl text-[#ffe8a1]">＋</span> تسجيل طلب جديد</Link>}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { href: "/dashboard/products/new", label: "منتج جديد", mark: "◇", permission: "products.write" },
            { href: "/dashboard/inventory?add=1", label: "إضافة مخزون", mark: "▣", permission: "inventory.write" },
            { href: "/dashboard/expenses?add=1", label: "إضافة مصروف", mark: "▣", permission: "expenses.write" },
            { href: "/dashboard/orders", label: "الطلبات", mark: "▤", permission: "orders.read" },
            { href: "/dashboard/inventory", label: "المخزون", mark: "▣", permission: "inventory.read" },
            { href: "/dashboard/returns", label: "المرتجعات", mark: "↶", permission: "returns.read" },
          ].filter(item => can(session.role, item.permission)).map(item => <Link key={item.href} href={item.href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[#e5e4ec] bg-white px-1 py-3 text-center text-xs font-semibold text-[#191735] shadow-sm hover:border-[#aaa5cf]"><span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-[#f0eef9] text-xl">{item.mark}</span>{item.label}</Link>)}
        </div>
      </section>
      <p className="text-sm text-slate-500">تكلفة المرتجعات خلال الفترة: <strong className="text-[#191735]">{money(report.returns.costs, currency)}</strong></p>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold">صافي المبيعات يوميًا</h2><p className="mt-1 text-xs text-slate-500">تطور المبيعات خلال الفترة المختارة</p><div className="mt-6"><SalesBars days={report.salesByDay} currency={currency} /></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold">أفضل المنتجات</h2><p className="mt-1 text-xs text-slate-500">حسب صافي مبيعات الطلبات</p><div className="mt-5 divide-y divide-slate-100">{report.products.slice(0, 6).map(p => <div key={p.key} className="flex justify-between gap-3 py-3 text-sm"><span className="min-w-0 truncate">{p.product} · {p.variant}</span><strong className="shrink-0">{money(p.net, currency)}</strong></div>)}{!report.products.length && <p className="py-10 text-center text-sm text-slate-500">لا توجد بيانات مبيعات بعد.</p>}</div></section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">تنبيهات المخزون</h2><Link href="/dashboard/inventory" className="text-sm font-medium text-[#514b8c] hover:underline">عرض المخزون ←</Link></div><div className="mt-5 flex flex-wrap gap-2">{report.lowStock.map(item => <span key={item.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{item.name}: {item.stock} {item.unit} (الحد {item.reorderLevel})</span>)}{!report.lowStock.length && <p className="py-3 text-sm text-slate-500">لا توجد تنبيهات مخزون حاليًا.</p>}</div></section>
    </main>
  );
}
