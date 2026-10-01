import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { productPresentationSchema, shopSettingsSchema } from "@/lib/storefront/config";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.role, "products.write")) return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    const body = await request.json();
    if (body.kind === "settings") {
      if (session.role !== "OWNER") return NextResponse.json({ error: "إعدادات المتجر متاحة لمالك المتجر فقط" }, { status: 403 });
      const parsed = shopSettingsSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
      if (parsed.data.enabled && (!parsed.data.shippingPolicy || !parsed.data.returnPolicy || !parsed.data.whatsapp && !parsed.data.contactEmail)) return NextResponse.json({ error: "أضف سياسة الشحن والإرجاع ووسيلة تواصل قبل تفعيل الطلبات" }, { status: 422 });
      await db.setting.upsert({ where: { storeId_key: { storeId: session.storeId, key: "storefront" } }, create: { storeId: session.storeId, key: "storefront", value: JSON.stringify(parsed.data) }, update: { value: JSON.stringify(parsed.data) } });
    } else if (body.kind === "product") {
      const parsed = productPresentationSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
      const data = parsed.data;
      const changed = await db.product.updateMany({ where: { id: data.id, storeId: session.storeId }, data: {
        storefrontPublished: data.published, storefrontDescription: data.description, storefrontCategory: data.category,
        storefrontImages: data.images, storefrontFeatured: data.featured,
      } });
      if (!changed.count) return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    } else return NextResponse.json({ error: "طلب غير صالح" }, { status: 422 });
    revalidatePath("/", "layout");
    return NextResponse.json({ data: { saved: true } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
    console.error("Storefront settings failed", error);
    return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  }
}
