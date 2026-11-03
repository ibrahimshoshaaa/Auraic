import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { getPublicShop } from "@/services/storefront/catalog";
import { boundedTrafficBody, trafficSchema } from "@/lib/storefront/traffic";
export async function POST(req: NextRequest) {
 try {
  const origin = req.headers.get("origin"); const host = req.headers.get("host");
  if (!origin || new URL(origin).host !== host) return new NextResponse(null, { status: 403 });
  if (/bot|crawler|spider|headless/i.test(req.headers.get("user-agent") || "")) return new NextResponse(null, { status: 204 });
  const text = await boundedTrafficBody(req); if (text === null) return new NextResponse(null, { status: 413 });
  let json: unknown; try { json = JSON.parse(text); } catch { return new NextResponse(null, { status: 422 }); }
  const input = trafficSchema.safeParse(json); if (!input.success) return new NextResponse(null, { status: 422 });
  const shop = await getPublicShop(); if (!shop) return new NextResponse(null, { status: 204 });
  const key = "traffic:" + createHash("sha256").update(`${shop.id}:${req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}:${Math.floor(Date.now()/60000)}:${process.env.AUTH_SECRET || ""}`).digest("hex");
  const limit = await db.storefrontRateLimit.upsert({ where: { key }, create: { key, expiresAt: new Date(Date.now()+120000) }, update: { count: { increment: 1 } } });
  if (limit.count > 60) return new NextResponse(null, { status: 429 });
  await db.storeVisit.createMany({ data: [{ ...input.data, storeId: shop.id }], skipDuplicates: true });
  await db.storeVisit.deleteMany({ where: { storeId: shop.id, createdAt: { lt: new Date(Date.now()-90*86400000) } } });
  await db.storefrontRateLimit.deleteMany({ where: { key: { startsWith: "traffic:" }, expiresAt: { lt: new Date() } } });
  return new NextResponse(null, { status: 204 });
 } catch (error) { console.error("Traffic recording failed", error instanceof Error ? error.name : "error"); return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 }); }
}
