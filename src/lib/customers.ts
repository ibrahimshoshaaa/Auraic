/** Order snapshots remain authoritative; never combine customers by name alone. */
export function phoneDigits(value: string) {
  return value.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776)).replace(/[^0-9]/g, "");
}
export function normalizeCustomerPhone(value: string | null) {
  let digits = phoneDigits(value ?? "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^01[0125]\d{8}$/.test(digits)) return `20${digits.slice(1)}`;
  if (/^201[0125]\d{8}$/.test(digits)) return digits;
  // Invalid/partial phones are isolated per order instead of merging unrelated people.
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}
export type CustomerOrder = {
  id: string; customerRef: string | null; customerPhone: string | null;
  customerAddress: string | null; occurredAt: Date; currency: string;
  total: unknown; refunded: unknown; hasProcessedReturn?: boolean; manualStatus: string | null; financialStatus: string | null;
};
export type Customer = {
  key: string; name: string; phone: string; address: string; ordersCount: number;
  deliveredCount: number; returnedCount: number; firstOrderAt: string; lastOrderAt: string;
  totals: Record<string, { orderValue: number; deliveredValue: number; refundedValue: number }>;
  orderIds: string[];
};
export function aggregateCustomers(orders: CustomerOrder[]) {
  const groups = new Map<string, Customer>();
  for (const order of [...orders].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || a.id.localeCompare(b.id))) {
    const phone = normalizeCustomerPhone(order.customerPhone);
    const key = phone ? `phone:${phone}` : `order:${order.id}`;
    let c = groups.get(key);
    if (!c) {
      c = { key, name: order.customerRef?.trim() || "عميل بدون اسم", phone: phone ?? "",
        address: order.customerAddress?.trim() || "", ordersCount: 0, deliveredCount: 0,
        returnedCount: 0, firstOrderAt: order.occurredAt.toISOString(), lastOrderAt: order.occurredAt.toISOString(), totals: {}, orderIds: [] };
      groups.set(key, c);
    }
    if (!c.address) c.address = order.customerAddress?.trim() || "";
    if (c.name === "عميل بدون اسم" && order.customerRef?.trim()) c.name = order.customerRef.trim();
    c.ordersCount++; c.orderIds.push(order.id); c.firstOrderAt = order.occurredAt.toISOString();
    const total = Math.max(0, Math.round(Number(order.total ?? 0) * 100));
    const refund = Math.max(0, Math.round(Number(order.refunded ?? 0) * 100));
    const money = c.totals[order.currency] ??= { orderValue: 0, deliveredValue: 0, refundedValue: 0 };
    money.orderValue += total; money.refundedValue += refund;
    if (order.manualStatus === "DELIVERED") { c.deliveredCount++; money.deliveredValue += Math.max(0, total - refund); }
    if (order.manualStatus === "RETURNED" || order.hasProcessedReturn) c.returnedCount++;
  }
  return [...groups.values()];
}
