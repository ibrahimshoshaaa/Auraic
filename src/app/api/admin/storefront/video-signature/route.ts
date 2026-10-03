import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "@/lib/auth-helpers";
export const runtime = "nodejs";
export async function POST() {
  try {
    const session = await requireAuth();
    if (session.role !== "OWNER") return NextResponse.json({ error: "رفع فيديو الموقع متاح لمالك المتجر فقط" }, { status: 403 });
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME, apiKey = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret) return NextResponse.json({ error: "اضبط بيانات Cloudinary في الاستضافة لتفعيل رفع الفيديو" }, { status: 503 });
    const params = { timestamp: Math.floor(Date.now() / 1000), folder: `auraic/${session.storeId}/hero`, allowed_formats: "mp4,webm", overwrite: "false" };
    return NextResponse.json({ data: { url: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`, fields: { ...params, api_key: apiKey, signature: cloudinary.utils.api_sign_request(params, secret) } } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
    return NextResponse.json({ error: "تعذر بدء رفع الفيديو" }, { status: 500 });
  }
}
