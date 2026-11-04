// Shared by the account editor and the server. Never accept arbitrary permission names.
export const permissionGroups = [
  { label: "الرئيسية والزيارات", items: [["dashboard.read", "عرض ملخص المبيعات"], ["traffic.read", "عرض إحصائيات الزيارات"]] },
  { label: "الطلبات والعملاء", items: [["orders.read", "عرض الطلبات"], ["orders.write", "إنشاء وتعديل الطلبات"], ["customers.read", "عرض بيانات العملاء"], ["payments.read", "عرض التحويلات والاستردادات"], ["payments.write", "مراجعة التحويلات وتأكيد الاسترداد"]] },
  { label: "المنتجات والوصفات", items: [["products.read", "عرض المنتجات والأسعار"], ["products.write", "إضافة وتعديل المنتجات ووصفاتها"], ["recipes.read", "عرض الوصفات ومقادير الخامات"], ["recipes.write", "إضافة وتعديل الوصفات"]] },
  { label: "المخزون والمصروفات", items: [["materials.read", "عرض الخامات والموردين"], ["materials.write", "تعديل الخامات والموردين"], ["inventory.read", "عرض المخزون"], ["inventory.write", "تعديل المخزون"], ["consumption.read", "عرض استهلاك الوصفات"], ["consumption.write", "تسجيل استهلاك الوصفات"], ["returns.read", "عرض المرتجعات"], ["returns.write", "معالجة المرتجعات"], ["expenses.read", "عرض المصروفات"], ["expenses.write", "تسجيل المصروفات"]] },
  { label: "التقارير والبيانات المالية", items: [["reports.read", "عرض تقارير المبيعات والتحصيل"], ["reports.export", "تصدير التقارير PDF وExcel"], ["costs.read", "عرض التكاليف وقيمة المخزون"], ["profits.read", "عرض الأرباح وهوامش الربح"]] },
  { label: "المتجر والتسويق", items: [["storefront.read", "عرض إعدادات واجهة المتجر"], ["storefront.write", "تعديل واجهة المتجر والصور والبيكسلز"], ["coupons.read", "عرض الكوبونات"], ["coupons.write", "إدارة الكوبونات"], ["settings.read", "عرض إعدادات المتجر"], ["settings.write", "تعديل إعدادات المتجر"]] },
] as const;
export const permissionNames: readonly string[] = permissionGroups.flatMap(g => g.items.map(i => i[0]));
export const permissionDependencies: Record<string, readonly string[]> = {
  "orders.write": ["orders.read"], "products.write": ["products.read", "recipes.write"],
  "recipes.write": ["recipes.read", "materials.read"], "materials.write": ["materials.read", "costs.read"],
  "inventory.read": ["materials.read"], "inventory.write": ["inventory.read"], "consumption.read": ["recipes.read"],
  "consumption.write": ["consumption.read", "inventory.write"],
  "returns.write": ["returns.read", "inventory.write", "expenses.write"],
  "expenses.read": ["costs.read"], "expenses.write": ["expenses.read"],
  "payments.write": ["payments.read"], "reports.export": ["reports.read"],
  "profits.read": ["costs.read"], "storefront.write": ["storefront.read"],
  "coupons.write": ["coupons.read"], "settings.write": ["settings.read", "costs.read"],
};
export function validatePermissions(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= permissionNames.length &&
    value.every(p => typeof p === "string" && permissionNames.includes(p)) &&
    new Set(value).size === value.length &&
    value.every(p => (permissionDependencies[p] ?? []).every(required => value.includes(required)));
}
export function selectedPermissions(current: readonly string[], key: string, checked: boolean): string[] {
  const next = new Set(current);
  function add(p: string) { next.add(p); for (const dep of permissionDependencies[p] ?? []) if (!next.has(dep)) add(dep); }
  if (checked) add(key); else {
    next.delete(key);
    let changed = true;
    while (changed) { changed = false; for (const p of next) if ((permissionDependencies[p] ?? []).some(d => !next.has(d))) { next.delete(p); changed = true; } }
  }
  return permissionNames.filter(p => next.has(p));
}
export const accessKey = (userId: string) => `userAccess:${userId}`;
export function parsePermissions(value: string): string[] {
  try { const parsed: unknown = JSON.parse(value); return validatePermissions(parsed) ? parsed : []; } catch { return []; }
}
