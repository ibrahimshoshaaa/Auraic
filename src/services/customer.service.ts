import { db } from "@/lib/db";
import { aggregateCustomers } from "@/lib/customers";

export async function getCustomers(storeId: string) {
  const orders = await db.order.findMany({ where: { storeId }, select: {
    id: true, customerRef: true, customerPhone: true, customerAddress: true,
    occurredAt: true, currency: true, total: true, refunded: true, manualStatus: true, financialStatus: true,
    _count: { select: { returns: { where: { processedAt: { not: null } } } } },
  } });
  return aggregateCustomers(orders.map(({ _count, ...order }) => ({ ...order, hasProcessedReturn: _count.returns > 0 })));
}
