import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.role, "products.write")) return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME, api_key = process.env.CLOUDINARY_API_KEY, api_secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud_name || !api_key || !api_secret) return NextResponse.json({ error: "اضبط بيانات Cloudinary في الاستضافة لتفعيل رفع الصور، أو استخدم رابط صورة HTTPS" }, { status: 503 });
    const data = await request.formData(); const file = data.get("file");
    if (!(file instanceof File) || file.size > 3 * 1024 * 1024 || file.size < 8) return NextResponse.json({ error: "اختر صورة JPG أو PNG حتى 3 ميجابايت" }, { status: 422 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if (!png && !jpeg) return NextResponse.json({ error: "الصورة يجب أن تكون JPG أو PNG" }, { status: 422 });
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    const image = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: `auraic/${session.storeId}`, resource_type: "image", allowed_formats: ["jpg", "jpeg", "png"], transformation: [{ width: 1800, height: 1800, crop: "limit" }, { quality: "auto" }] }, (error, result) => {
        if (error || !result) reject(error || new Error("Upload failed")); else resolve(result);
      }).end(buffer);
    });
    return NextResponse.json({ data: { url: image.secure_url } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
    console.error("Image upload failed", error);
    return NextResponse.json({ error: "تعذر رفع الصورة" }, { status: 500 });
  }
}
