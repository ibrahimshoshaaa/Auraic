import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkoutSchema, governorates } from "@/lib/storefront/config";
import { couponCode, CouponError } from "@/lib/storefront/coupons";
import { getPublicShop } from "@/services/storefront/catalog";
import { quoteOrder, QuoteError } from "@/services/storefront/quote";
const schema = z.object({ code: couponCode, items: checkoutSchema.shape.items, governorate: z.union([z.enum(governorates), z.literal("")]).default("") });
export async function POST(request: NextRequest) { try {
  const allowed = new URL(process.env.STOREFRONT_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).origin;
  if (request.headers.get("origin") !== allowed) return NextResponse.json({ error: "Open the store to apply a coupon." }, { status: 403 });
  const raw = await request.text(); if (raw.length > 20000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  const parsed = schema.safeParse(JSON.parse(raw)); if (!parsed.success) return NextResponse.json({ error: "Check the coupon code and your bag." }, { status: 422 });
  const shop = await getPublicShop(); if (!shop?.settings.enabled) return NextResponse.json({ error: "Orders are currently paused." }, { status: 503 });
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET missing");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = createHmac("sha256", process.env.AUTH_SECRET).update(`coupon:${shop.id}:${ip}:${Math.floor(Date.now() / 60000)}`).digest("hex");
  const rate = await db.storefrontRateLimit.upsert({ where: { key }, create: { key, expiresAt: new Date(Date.now() + 120000) }, update: { count: { increment: 1 } } });
  if (rate.count > 30) return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  const quote = await quoteOrder(db, shop.id, shop.settings, parsed.data.items, parsed.data.governorate, parsed.data.code);
  return NextResponse.json({ data: { ...quote.totals, code: quote.coupon!.code, freeShipping: quote.freeShipping } }, { headers: { "Cache-Control": "no-store" } });
} catch (error) {
  if (error instanceof CouponError || error instanceof QuoteError) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  console.error("Coupon validation failed", error); return NextResponse.json({ error: "Unable to apply the coupon. Please try again." }, { status: 500 });
} }
