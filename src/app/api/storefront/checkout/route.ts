import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutSchema } from "@/lib/storefront/config";
import { quoteOrder, QuoteError } from "@/services/storefront/quote";
import { CouponError } from "@/lib/storefront/coupons";
import { getPublicShop } from "@/services/storefront/catalog";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const allowedOrigin = new URL(process.env.STOREFRONT_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).origin;
    if (!origin || origin !== allowedOrigin) return NextResponse.json({ error: "أرسل الطلب من المتجر مباشرة" }, { status: 403 });
    if (Number(request.headers.get("content-length") || 0) > 20000) return NextResponse.json({ error: "حجم الطلب كبير" }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 20000) return NextResponse.json({ error: "حجم الطلب كبير" }, { status: 413 });
    const parsed = checkoutSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "راجع بيانات الطلب" }, { status: 422 });
    const input = parsed.data;
    const shop = await getPublicShop();
    if (!shop?.settings.enabled) return NextResponse.json({ error: "المتجر غير متاح للطلبات حاليًا" }, { status: 503 });
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET missing");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = createHmac("sha256", secret).update(`${shop.id}:${ip}:${Math.floor(Date.now() / 3600000)}`).digest("hex");
    const rate = await db.storefrontRateLimit.upsert({ where: { key }, create: { key, expiresAt: new Date(Date.now() + 7200000) }, update: { count: { increment: 1 } } });
    if (rate.count > 15) return NextResponse.json({ error: "طلبات كثيرة، حاول مرة أخرى لاحقًا" }, { status: 429 });
    await db.storefrontRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const orderId = `web_${input.requestId}`;
    const existing = await db.order.findFirst({ where: { id: orderId, storeId: shop.id }, select: { orderNumber: true, total: true } });
    if (existing) return NextResponse.json({ data: { orderNumber: existing.orderNumber, total: Number(existing.total) } });
    const decimal = (cents: number) => new Prisma.Decimal(cents).div(100);
    const orderNumber = `A-${input.requestId.slice(0, 12).toUpperCase()}`;
    let finalTotal = 0; let reused = false; let confirmedNumber = orderNumber;
    try {
      await db.$transaction(async tx => {
        // Serialize retries before reserving any coupon usage.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 0))::text`;
        const retry = await tx.order.findFirst({ where: { id: orderId, storeId: shop.id }, select: { total: true, orderNumber: true } });
        if (retry) { finalTotal = Math.round(Number(retry.total) * 100); confirmedNumber = retry.orderNumber || orderNumber; reused = true; return; }
        const { byId, totals, coupon, lineDiscounts } = await quoteOrder(tx, shop.id, shop.settings, input.items, input.governorate, input.couponCode, true);
        if (totals.totalCents !== input.expectedTotalCents) throw new QuoteError("Prices or shipping have changed. Review your bag and reapply your coupon.");
        finalTotal = totals.totalCents;
        if (coupon) await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        await tx.order.create({ data: {
          id: orderId, storeId: shop.id, orderNumber, financialStatus: "PENDING", fulfillmentStatus: "UNFULFILLED", manualStatus: "NEW",
          currency: "EGP", subtotal: decimal(totals.subtotalCents), shipping: decimal(totals.shippingCents), tax: 0, discount: decimal(totals.discountCents), couponCode: coupon?.code,
          total: decimal(totals.totalCents), netSales: decimal(totals.subtotalCents - totals.discountCents), refunded: 0,
          customerRef: input.name, customerPhone: input.phone, customerAddress: `${input.governorate} · ${input.address}`, occurredAt: new Date(),
          items: { create: input.items.map((item, index) => {
            const variant = byId.get(item.variantId)!;
            const priceCents = Math.round(Number(variant.price) * 100);
            return { variantId: variant.id, title: `${variant.product.title} · ${variant.title}`, sku: variant.sku,
              quantity: item.quantity, originalPrice: decimal(priceCents), finalLinePrice: decimal(priceCents * item.quantity - lineDiscounts[index]), discount: decimal(lineDiscounts[index]), refunded: 0 };
          }) },
        } });
        await tx.auditLog.create({ data: { storeId: shop.id, action: "CREATE", entity: "Order", entityId: orderId, metadata: { source: "STOREFRONT", payment: "COD", note: input.note } } });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const duplicate = await db.order.findFirst({ where: { id: orderId, storeId: shop.id }, select: { orderNumber: true, total: true } });
      if (!duplicate) throw error;
      return NextResponse.json({ data: { orderNumber: duplicate.orderNumber, total: Number(duplicate.total) } });
    }
    return NextResponse.json({ data: { orderNumber: confirmedNumber, total: finalTotal / 100 } }, { status: reused ? 200 : 201 });
  } catch (error) {
    if (error instanceof QuoteError || error instanceof CouponError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "راجع بيانات الطلب" }, { status: 422 });
    console.error("Storefront checkout failed", error);
    return NextResponse.json({ error: "تعذر تسجيل الطلب. حاول ثانية بنفس السلة." }, { status: 500 });
  }
}
