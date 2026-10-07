import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const decisionSchema = z.object({ orderId: z.string().startsWith("web_"), decision: z.enum(["APPROVED", "REJECTED"]) });
function metadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export async function GET() {
  const session = await requireAuth();
  if (!["OWNER", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const logs = await db.auditLog.findMany({ where: { storeId: session.storeId, entity: "Order", action: "CREATE", entityId: { not: null } }, orderBy: { createdAt: "desc" }, take: 500 });
  const transferLogs = logs.filter(log => ["INSTAPAY", "WALLET"].includes(String(metadata(log.metadata).payment)));
  const ids = transferLogs.map(log => log.entityId).filter((id): id is string => !!id);
  const [orders, reviews] = await Promise.all([
    db.order.findMany({ where: { storeId: session.storeId, id: { in: ids } }, select: { id: true, orderNumber: true, customerRef: true, customerPhone: true, total: true, depositAmount: true, financialStatus: true, manualStatus: true } }),
    db.auditLog.findMany({ where: { storeId: session.storeId, entity: "PaymentReview", entityId: { in: ids } }, orderBy: { createdAt: "desc" } }),
  ]);
  const byId = new Map(orders.map(order => [order.id, order]));
  const reviewById = new Map<string, string>();
  for (const log of reviews) if (log.entityId && !reviewById.has(log.entityId)) reviewById.set(log.entityId, String(metadata(log.metadata).decision || ""));
  return NextResponse.json({ data: transferLogs.flatMap(log => {
    const order = byId.get(log.entityId || ""); if (!order) return [];
    const meta = metadata(log.metadata);
    return [{ ...order, total: Number(order.total), depositAmount: Number(order.depositAmount), method: meta.payment, plan: meta.paymentPlan, reference: meta.transferReference, requestedAmount: Number(meta.requestedCents || 0) / 100, review: reviewById.get(order.id) || "PENDING" }];
  }) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!["OWNER", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const { orderId, decision } = parsed.data;
  try {
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 0))::text`;
      const order = await tx.order.findFirst({ where: { id: orderId, storeId: session.storeId } });
      if (!order) return "NOT_FOUND";
      const created = await tx.auditLog.findFirst({ where: { storeId: session.storeId, entity: "Order", entityId: orderId, action: "CREATE" } });
      const meta = metadata(created?.metadata);
      if (!["INSTAPAY", "WALLET"].includes(String(meta.payment))) return "NOT_TRANSFER";
      const prior = await tx.auditLog.findFirst({ where: { storeId: session.storeId, entity: "PaymentReview", entityId: orderId } });
      if (prior) return "ALREADY_REVIEWED";
      if (["RETURNED", "DELIVERED"].includes(order.manualStatus || "")) return "CLOSED";
      const requested = Number(meta.requestedCents);
      const totalCents = Math.round(Number(order.total || 0) * 100);
      if (!Number.isSafeInteger(requested) || requested <= 0 || requested > totalCents) return "INVALID_AMOUNT";
      if (decision === "APPROVED") {
        const amount = new Prisma.Decimal(requested).div(100);
        await tx.order.update({ where: { id: orderId }, data: { depositAmount: amount, financialStatus: requested === totalCents ? "PAID" : "PARTIALLY_PAID" } });
      }
      await tx.auditLog.create({ data: { storeId: session.storeId, userId: session.userId, action: "REVIEW", entity: "PaymentReview", entityId: orderId, metadata: { decision, requestedCents: requested, method: String(meta.payment) } } });
      return "OK";
    });
    return NextResponse.json({ status: result }, { status: result === "OK" ? 200 : 409 });
  } catch (error) { console.error("Payment review failed", error); return NextResponse.json({ error: "Unable to review payment" }, { status: 500 }); }
}
