import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { pushConfigured, sendPush } from "./fcm";

/** Called inside order creation: retries cannot queue the same delivery twice. */
export async function queueOrderPush(tx: Prisma.TransactionClient, storeId: string, orderId: string) {
  const sessions = await tx.mobileSession.findMany({ where: {
    storeId, revokedAt: null, expiresAt: { gt: new Date() }, pushToken: { not: null },
    user: { status: "ACTIVE", storeId, store: { status: "ACTIVE" } },
  }, select: { id: true, pushToken: true, user: { select: { role: true } } } });
  const recipients = sessions.filter(session => can(session.user.role, "orders.read"));
  if (recipients.length) await tx.pushDelivery.createMany({
    data: recipients.map(session => ({ orderId, sessionId: session.id, token: session.pushToken! })),
    skipDuplicates: true,
  });
}

export async function deliverOrderPushes(orderId?: string) {
  if (!pushConfigured()) return;
  const now = new Date();
  const stale = new Date(now.getTime() - 120000);
  const available = { finishedAt: null, nextAttemptAt: { lte: now }, attempts: { lt: 6 },
    OR: [{ claimedAt: null }, { claimedAt: { lt: stale } }] };
  const deliveries = await db.pushDelivery.findMany({ where: { ...available, ...(orderId ? { orderId } : {}) },
    take: 4, orderBy: { createdAt: "asc" } });
  for (const delivery of deliveries) {
    const claim = await db.pushDelivery.updateMany({ where: { id: delivery.id, ...available },
      data: { claimedAt: now, attempts: { increment: 1 } } });
    if (!claim.count) continue;
    try {
      const session = await db.mobileSession.findUnique({ where: { id: delivery.sessionId },
        include: { user: { include: { store: true } } } });
      const order = await db.order.findUnique({ where: { id: delivery.orderId } });
      // Re-check access immediately before sending, including logout/token rotation.
      if (!session || session.revokedAt || session.expiresAt <= new Date() ||
          session.pushToken !== delivery.token || session.user.status !== "ACTIVE" ||
          session.user.store.status !== "ACTIVE" || session.storeId !== session.user.storeId ||
          !can(session.user.role, "orders.read") || !order || order.storeId !== session.storeId ||
          Date.now() - delivery.createdAt.getTime() > 86400000) {
        await db.pushDelivery.update({ where: { id: delivery.id }, data: { finishedAt: new Date() } });
        continue;
      }
      const result = await sendPush(delivery.token, {
        title: "طلب جديد · Auraic", body: `وصلك طلب #${order.orderNumber || order.id} — افتح التطبيق لمراجعته`,
        data: { type: "new_order", orderId: order.id }, tag: order.id,
      });
      if (result === "invalid") await db.mobileSession.updateMany({
        where: { id: session.id, pushToken: delivery.token }, data: { pushToken: null },
      });
      await db.pushDelivery.update({ where: { id: delivery.id }, data: { finishedAt: new Date() } });
    } catch {
      await db.pushDelivery.update({ where: { id: delivery.id }, data: {
        claimedAt: null, nextAttemptAt: new Date(Date.now() + 60000 * 2 ** delivery.attempts),
      } });
      console.error("Order notification deferred for retry");
    }
  }
  await db.pushDelivery.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
}
