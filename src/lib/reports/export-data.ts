import type { getBusinessReport } from "@/services/report.service";
export type BusinessReport = Awaited<ReturnType<typeof getBusinessReport>>;
export type ExportCell = string | number | null;
export type ExportTable = { name: string; columns: string[]; rows: ExportCell[][]; moneyColumns?: number[] };
export function reportExportData(r: BusinessReport) {
  const summary: ExportCell[][] = [
    ["العملة", r.currency], ["من", r.range.from], ["إلى", r.range.to], ["التوقيت", r.range.timeZone],
    ["إجمالي المبيعات بعد الخصم بدون الشحن", r.sales.total], ["الشحن", r.sales.shipping],
    ["المبيعات قبل الخصم بدون الشحن", r.sales.gross - r.sales.shipping], ["الخصومات", r.sales.discounts],
    ["المبالغ المستردة", r.sales.refunded], ["صافي الطلبات", r.sales.net], ["عدد الطلبات", r.sales.orders],
    ["الوحدات المباعة", r.sales.units], ["متوسط قيمة الطلب", r.sales.averageOrderValue],
    ["الديبوزت المستلم", r.cash.deposits], ["باقي المبلغ عند التسليم", r.cash.deliveryBalances], ["إجمالي المستلم للطلبات اليدوية", r.cash.received],
    ["عدد المرتجعات", r.returns.count], ["الوحدات المرتجعة", r.returns.units], ["قيمة المرتجعات", r.returns.value], ["تكلفة المرتجعات", r.returns.costs],
    ["أعيد للمخزون", r.returns.restocked], ["لم يعد للمخزون", r.returns.notRestocked],
    ["إجمالي المصروفات", r.expenses.total], ["تكاليف مرتجعات ضمن المصروفات", r.expenses.returnCosts], ["مشتريات مواد ضمن المصروفات", r.expenses.materialPurchases],
    ["إيراد المنتجات لحساب الربح", r.profit.revenue], ["بنود بتكلفة غير مكتملة", r.profit.missingLines], ["تكلفة المنتجات التقديرية", r.profitability.estimatedProductCost], ["الربح بعد تكلفة الوصفات", r.profitability.estimatedGrossProfit],
    ["هامش الربح %", r.profitability.estimatedGrossMargin], ["تكاليف غير مكتملة", r.profitability.incomplete ? "نعم" : "لا"],
    ["تكاليف مقدرة من الأسعار الحالية", r.profitability.estimated ? "نعم" : "لا"],
    ["مبيعات ROAS", r.roas.sales], ["مصاريف السوشيال", r.roas.spend], ["ROAS", r.roas.ratio],
    ["طلبات مستبعدة لاختلاف العملة", r.notes.excludedDifferentCurrencyOrders],
  ];
  const notes = [
    `المبالغ بعملة ${r.currency}. الطلبات بعملة مختلفة مستبعدة بنفس قواعد التقرير.`,
    "المبيعات المستحقة والدفعات المستلمة مقياسان مختلفان. الدفعات تخص الطلبات اليدوية وقبل المبالغ المردودة.",
    "استردادات المبيعات محسوبة بتاريخ الطلب الأصلي؛ نشاط المرتجعات محسوب بتاريخ المرتجع.",
    "صافي البنود لا يشمل الشحن والضرائب، بخلاف صافي الطلبات. إجمالي المصروفات يشمل تكاليف المرتجعات المسجلة؛ لا تجمعهما مرتين.",
    "الربح بعد تكلفة الوصفات لا يشمل المصروفات التشغيلية. التكلفة القديمة قد تكون تقديرية بالأسعار الحالية.",
    r.profitability.incomplete ? "بعض تكاليف الوصفات أو استهلاك البنود غير مكتمل؛ الربح غير متاح ولا يعامل كصفر." : "التكلفة التقديرية حسب بيانات التقرير.",
    "المخزون رصيد حالي وقت التصدير، وحركته تخص الفترة المختارة. ليس رصيد نهاية الفترة التاريخي.",
    "الخانة غير المتاحة تظهر فارغة في Excel وبشرطة في PDF. لا تحول إلى صفر.",
  ];
  const tables: ExportTable[] = [
    { name: "الملخص", columns: ["البيان", "القيمة"], rows: summary },
    { name: "المبيعات اليومية", columns: ["التاريخ", "الإجمالي", "الصافي", "الطلبات"], rows: r.salesByDay.map(x => [x.date,x.gross,x.net,x.orders]), moneyColumns:[1,2] },
    { name: "أداء المنتجات", columns: ["المنتج", "الصنف", "الوحدات", "الإجمالي", "الخصم", "الاسترداد", "الصافي", "وحدات مرتجعة", "تكلفة تقديرية"], rows:r.products.map(x=>[x.product,x.variant,x.units,x.gross,x.discounts,x.refunds,x.net,x.returnedUnits,x.estimatedCost]), moneyColumns:[3,4,5,6,8] },
    { name: "المرتجعات اليومية", columns:["التاريخ","عدد المرتجعات","القيمة"], rows:r.returnsByDay.map(x=>[x.date,x.count,x.value]), moneyColumns:[2] },
    { name: "المنتجات المرتجعة", columns:["المنتج","الصنف","الوحدات"], rows:r.returnedProducts.map(x=>[x.product,x.variant,x.units]) },
    { name: "فئات المصروفات", columns:["الفئة","المبلغ"], rows:r.expenses.byCategory.map(x=>[x.category,x.amount]), moneyColumns:[1] },
    { name: "تفاصيل المصروفات", columns:["التاريخ","الفئة","المبلغ","الوصف","المرجع"], rows:r.expenses.rows.map(x=>[new Intl.DateTimeFormat('en-CA',{timeZone:r.range.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x.date)),x.category,x.amount,x.description,x.reference]), moneyColumns:[2] },
    { name: "استهلاك المواد", columns:["المادة","الوحدة","الاستهلاك","الطلبات","الأصناف"], rows:r.consumption.map(x=>[x.name,x.unit,x.consumed,x.orders,x.products]) },
    { name: "المخزون الحالي", columns:["المادة","النوع","الوحدة","الرصيد الحالي","الحد الأدنى","قيمة تقديرية"], rows:r.inventory.map(x=>[x.name,x.type,x.unit,x.stock,x.reorderLevel,x.estimatedValue]), moneyColumns:[5] },
    { name: "حركة المخزون", columns:["المادة","الوحدة","مشتريات","استهلاك","هالك","إعادة تخزين","تعديلات"], rows:r.inventory.map(x=>[x.name,x.unit,x.purchased,x.consumed,x.wasted,x.returned,x.adjusted]) },
    { name: "مخزون منخفض", columns:["المادة","الوحدة","الرصيد الحالي","الحد الأدنى"], rows:r.lowStock.map(x=>[x.name,x.unit,x.stock,x.reorderLevel]) },
    { name: "ملاحظات الحساب", columns:["التوضيح"], rows:notes.map(x=>[x]) },
  ];
  return { tables, notes };
}
export function exportFilename(r: BusinessReport, format: "pdf" | "xlsx") { return `auraic-report-${r.range.from}-${r.range.to}.${format}`; }
