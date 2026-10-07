import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const schema = z.object({ orderId: z.string().min(1), reference: z.string().trim().min(3).max(150) });

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!["OWNER", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Order ID and refund reference are required" }, { status: 422 });
  const { orderId, reference } = parsed.data;
  try {
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 0))::text`;
      const order = await tx.order.findFirst({ where: { id: orderId, storeId: session.storeId } });
      if (!order || order.manualStatus !== "RETURNED" || order.financialStatus !== "REFUND_PENDING") return "NOT_PENDING";
      const pending = await tx.auditLog.findFirst({ where: { storeId: session.storeId, entity: "OrderRefund", entityId: orderId, action: "REFUND_PENDING" }, orderBy: { createdAt: "desc" } });
      const meta = pending?.metadata;
      const amount = meta && typeof meta === "object" && !Array.isArray(meta) ? Number(meta.amount) : NaN;
      if (!Number.isFinite(amount) || amount <= 0 || amount > Number(order.total)) return "INVALID_AMOUNT";
      await tx.order.update({ where: { id: orderId }, data: { financialStatus: "REFUNDED", refunded: new Prisma.Decimal(amount) } });
      await tx.auditLog.create({ data: { storeId: session.storeId, userId: session.userId, entity: "OrderRefund", entityId: orderId, action: "REFUND_CONFIRMED", metadata: { amount, reference, returnId: meta && typeof meta === "object" && !Array.isArray(meta) ? meta.returnId : null } } });
      return "OK";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ status: result }, { status: result === "OK" ? 200 : 409 });
  } catch (error) { console.error("Refund confirmation failed", error); return NextResponse.json({ error: "Unable to confirm refund" }, { status: 500 }); }
}
