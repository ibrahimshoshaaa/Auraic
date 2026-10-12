import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { calculateOrderDiscount } from "@/lib/order-discount";

const schema = z.object({ amount: z.number().finite().nonnegative().max(1000000), updatedAt: z.iso.datetime() });
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (!can(session.role, "orders.write")) return NextResponse.json({ error: "غير مسموح بتعديل الطلب" }, { status: 403 });
    const input = schema.parse(await request.json());
    const { id } = await params;
    const result = await db.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id, storeId: session.storeId }, include: { items: true } });
      if (!order) return { error: "الطلب غير موجود", status: 404 };
      if (!["NEW", "PREPARED", "SHIPPING"].includes(order.manualStatus ?? "") ||
        !["PENDING", "PARTIALLY_PAID"].includes(order.financialStatus ?? "") || Number(order.refunded) > 0)
        return { error: "الخصم متاح قبل التسليم والتحصيل فقط؛ الطلب المدفوع يحتاج تسوية أو استرداد", status: 409 };
      let amounts;
      try { amounts = calculateOrderDiscount({ total: Number(order.total), discount: Number(order.discount),
        adminDiscount: Number(order.adminDiscount), deposit: Number(order.depositAmount), amount: input.amount,
        items: order.items.map(item => ({ finalLinePrice: Number(item.finalLinePrice), discount: Number(item.discount), adminDiscount: Number(item.adminDiscount) })) }); }
      catch (error) { return { error: error instanceof Error ? error.message : "خصم غير صحيح", status: 422 }; }
      if (order.financialStatus === "PENDING" && id.startsWith("web_")) {
        const creation = await tx.auditLog.findFirst({ where: { storeId: session.storeId, entity: "Order", entityId: id, action: "CREATE" }, select: { metadata: true } });
        const meta = creation?.metadata;
        if (meta && typeof meta === "object" && !Array.isArray(meta) && ["INSTAPAY", "WALLET"].includes(String(meta.payment)) &&
          (Number(meta.requestedCents) > Math.round(amounts.total * 100) || (meta.paymentPlan === "FULL" && amounts.total !== Number(order.total))))
          return { error: "راجع التحويل أولًا؛ الخصم سيغيّر المبلغ الذي أرسله العميل", status: 409 };
      }
      const changed = await tx.order.updateMany({ where: { id, storeId: session.storeId, updatedAt: new Date(input.updatedAt) }, data: {
        total: amounts.total, discount: amounts.discount, adminDiscount: amounts.adminDiscount,
        netSales: new Prisma.Decimal(order.netSales ?? 0).add(order.adminDiscount).sub(amounts.adminDiscount),
        financialStatus: Number(order.depositAmount) > 0 ? "PARTIALLY_PAID" : "PENDING",
      } });
      if (!changed.count) return { error: "تغير الطلب؛ حدّث القائمة وحاول مرة أخرى", status: 409 };
      for (const [index, item] of order.items.entries()) await tx.orderItem.update({ where: { id: item.id }, data: amounts.items[index] });
      await tx.auditLog.create({ data: { storeId: session.storeId, userId: session.userId, action: "UPDATE", entity: "OrderDiscount", entityId: id,
        metadata: { previousAmount: Number(order.adminDiscount), amount: amounts.adminDiscount, total: amounts.total } } });
      return { data: amounts, status: 200 };
    });
    return NextResponse.json(result.error ? { error: result.error } : { data: result.data }, { status: result.status });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "راجع مبلغ الخصم وحدّث الطلب" }, { status: 422 });
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
    console.error("Order discount failed", error);
    return NextResponse.json({ error: "تعذر حفظ الخصم" }, { status: 500 });
  }
}
