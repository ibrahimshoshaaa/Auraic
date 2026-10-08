import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { getPublicShop } from "@/services/storefront/catalog";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const allowed = new URL(process.env.STOREFRONT_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).origin;
    if (!origin || origin !== allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (Number(request.headers.get("content-length") || 0) > 3 * 1024 * 1024) return NextResponse.json({ error: "Image too large" }, { status: 413 });
    const shop = await getPublicShop();
    if (!shop?.settings.enabled) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET missing");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = createHmac("sha256", secret).update(`receipt:${shop.id}:${ip}:${Math.floor(Date.now() / 3600000)}`).digest("hex");
    const rate = await db.storefrontRateLimit.upsert({ where: { key }, create: { key, expiresAt: new Date(Date.now() + 7200000) }, update: { count: { increment: 1 } } });
    if (rate.count > 12) return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
    const form = await request.formData();
    const requestId = String(form.get("requestId") || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return NextResponse.json({ error: "Invalid order reference" }, { status: 422 });
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 8 || file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Select a JPG or PNG under 2 MB" }, { status: 422 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if (!png && !jpeg) return NextResponse.json({ error: "Only JPG and PNG images are allowed" }, { status: 422 });
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME, api_key = process.env.CLOUDINARY_API_KEY, api_secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud_name || !api_key || !api_secret) return NextResponse.json({ error: "Receipt storage unavailable" }, { status: 503 });
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    const publicId = `auraic/payment-receipts/${shop.id}/${requestId}`;
    const image = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ public_id: publicId, type: "authenticated", resource_type: "image", overwrite: true, allowed_formats: ["jpg", "jpeg", "png"], invalidate: true }, (error, result) => {
        if (error || !result) reject(error || new Error("Upload failed")); else resolve(result);
      }).end(buffer);
    });
    return NextResponse.json({ data: { receiptId: image.public_id } });
  } catch (error) {
    console.error("Payment receipt upload failed", error);
    return NextResponse.json({ error: "Unable to upload receipt" }, { status: 500 });
  }
}
