import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutSchema } from "@/lib/storefront/config";
import { checkoutTotals } from "@/lib/storefront/pricing";
import { getPublicShop } from "@/services/storefront/catalog";
import { activeProductStatus } from "@/lib/active-product";

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
    const ids = input.items.map(item => item.variantId);
    if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "الصنف مكرر في السلة" }, { status: 422 });
    const variants = await db.productVariant.findMany({
      where: { storeId: shop.id, id: { in: ids }, active: true, price: { gt: 0 },
        product: { storefrontPublished: true, ...activeProductStatus },
        recipes: { some: { active: true, versions: { some: { isCurrent: true, items: { some: {} } } } } } },
      include: { product: { select: { title: true } } },
    });
    if (variants.length !== ids.length) return NextResponse.json({ error: "أحد العطور لم يعد متاحًا. راجع السلة." }, { status: 409 });
    const byId = new Map(variants.map(variant => [variant.id, variant]));
    const totals = checkoutTotals(input.items.map(item => ({ quantity: item.quantity, price: Number(byId.get(item.variantId)!.price) })), shop.settings.shippingFee, shop.settings.freeShippingFrom);
    if (totals.totalCents !== input.expectedTotalCents) return NextResponse.json({ error: "تغير السعر أو الشحن. حدّث الصفحة لمراجعة الإجمالي قبل التأكيد." }, { status: 409 });
    const decimal = (cents: number) => new Prisma.Decimal(cents).div(100);
    const orderNumber = `A-${input.requestId.slice(0, 12).toUpperCase()}`;
    try {
      await db.$transaction(async tx => {
        await tx.order.create({ data: {
          id: orderId, storeId: shop.id, orderNumber, financialStatus: "PENDING", fulfillmentStatus: "UNFULFILLED", manualStatus: "NEW",
          currency: "EGP", subtotal: decimal(totals.subtotalCents), shipping: decimal(totals.shippingCents), tax: 0, discount: 0,
          total: decimal(totals.totalCents), netSales: decimal(totals.subtotalCents), refunded: 0,
          customerRef: input.name, customerPhone: input.phone, customerAddress: `${input.governorate} · ${input.address}`, occurredAt: new Date(),
          items: { create: input.items.map(item => {
            const variant = byId.get(item.variantId)!;
            const priceCents = Math.round(Number(variant.price) * 100);
            return { variantId: variant.id, title: `${variant.product.title} · ${variant.title}`, sku: variant.sku,
              quantity: item.quantity, originalPrice: decimal(priceCents), finalLinePrice: decimal(priceCents * item.quantity), discount: 0, refunded: 0 };
          }) },
        } });
        await tx.auditLog.create({ data: { storeId: shop.id, action: "CREATE", entity: "Order", entityId: orderId, metadata: { source: "STOREFRONT", payment: "COD" } } });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const duplicate = await db.order.findFirst({ where: { id: orderId, storeId: shop.id }, select: { orderNumber: true, total: true } });
      if (!duplicate) throw error;
      return NextResponse.json({ data: { orderNumber: duplicate.orderNumber, total: Number(duplicate.total) } });
    }
    return NextResponse.json({ data: { orderNumber, total: totals.totalCents / 100 } }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "راجع بيانات الطلب" }, { status: 422 });
    console.error("Storefront checkout failed", error);
    return NextResponse.json({ error: "تعذر تسجيل الطلب. حاول ثانية بنفس السلة." }, { status: 500 });
  }
}
