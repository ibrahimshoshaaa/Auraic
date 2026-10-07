import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const session = await requireAuth();
  if (!["OWNER", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const orders = await db.order.findMany({
    where: { storeId: session.storeId, manualStatus: "RETURNED", financialStatus: "REFUND_PENDING" },
    select: { id: true, orderNumber: true, customerRef: true, customerPhone: true, depositAmount: true, total: true },
    orderBy: { updatedAt: "desc" }, take: 200,
  });
  const logs = await db.auditLog.findMany({
    where: { storeId: session.storeId, entity: "OrderRefund", action: "REFUND_PENDING", entityId: { in: orders.map(order => order.id) } },
    orderBy: { createdAt: "desc" },
  });
  const pending = new Map<string, number>();
  for (const log of logs) {
    if (!log.entityId || pending.has(log.entityId)) continue;
    const meta = log.metadata;
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) continue;
    const amount = Number(meta.amount);
    if (Number.isFinite(amount) && amount > 0) pending.set(log.entityId, amount);
  }
  return NextResponse.json({ data: orders.map(order => ({
    id: order.id, orderNumber: order.orderNumber, customerRef: order.customerRef,
    customerPhone: order.customerPhone, amount: pending.get(order.id) ?? 0,
  })) }, { headers: { "Cache-Control": "no-store" } });
}
