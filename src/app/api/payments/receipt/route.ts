import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!["OWNER", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const orderId = request.nextUrl.searchParams.get("orderId") || "";
  if (!/^web_[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Invalid order" }, { status: 422 });
  const order = await db.order.findFirst({ where: { id: orderId, storeId: session.storeId }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const created = await db.auditLog.findFirst({ where: { storeId: session.storeId, entity: "Order", action: "CREATE", entityId: orderId } });
  const meta = created?.metadata && typeof created.metadata === "object" && !Array.isArray(created.metadata) ? created.metadata as Record<string, unknown> : {};
  const receiptId = String(meta.receiptId || "");
  if (receiptId !== `auraic/payment-receipts/${session.storeId}/${orderId.slice(4)}`) return NextResponse.json({ error: "Receipt unavailable" }, { status: 404 });
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME, api_key = process.env.CLOUDINARY_API_KEY, api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  try {
    const resource = await cloudinary.api.resource(receiptId, { type: "authenticated", resource_type: "image" });
    const url = cloudinary.utils.private_download_url(receiptId, resource.format, { resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 300 });
    return NextResponse.json({ data: { url } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Receipt unavailable" }, { status: 404 });
  }
}
