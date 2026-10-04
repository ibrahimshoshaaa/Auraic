import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { productPresentationSchema, shopSettingsSchema } from "@/lib/storefront/config";
import { z } from "zod";
import { getShopSettings } from "@/services/storefront/catalog";
import { activeProductStatus } from "@/lib/active-product";
import { revalidatePath } from "next/cache";

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.role, "products.write")) return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    const body = await request.json();
    if (body.kind === "availability") {
      if (session.role !== "OWNER") return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
      const parsed = z.object({ enabled: z.boolean() }).safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: "راجع حالة استقبال الطلبات" }, { status: 422 });
      const current = await getShopSettings(session.storeId);
      const settings = { ...current, enabled: parsed.data.enabled };
      await db.setting.upsert({ where: { storeId_key: { storeId: session.storeId, key: "storefront" } }, create: { storeId: session.storeId, key: "storefront", value: JSON.stringify(settings) }, update: { value: JSON.stringify(settings) } });
    } else if (body.kind === "settings") {
      if (session.role !== "OWNER") return NextResponse.json({ error: "إعدادات المتجر متاحة لمالك المتجر فقط" }, { status: 403 });
      const current = await getShopSettings(session.storeId);
      const parsed = shopSettingsSchema.safeParse({ ...current, ...body.data });
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
      await db.setting.upsert({ where: { storeId_key: { storeId: session.storeId, key: "storefront" } }, create: { storeId: session.storeId, key: "storefront", value: JSON.stringify(parsed.data) }, update: { value: JSON.stringify(parsed.data) } });
    } else if (body.kind === "product") {
      const parsed = productPresentationSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
      const data = parsed.data;
      const changed = await db.product.updateMany({ where: { id: data.id, storeId: session.storeId }, data: {
        storefrontPublished: data.published, storefrontDescription: data.description, storefrontCategory: data.category,
        storefrontImages: data.images, storefrontFeatured: data.featured,
        storefrontInspiredBy: data.inspiredBy, storefrontScentFamily: data.scentFamily,
        ...(data.badge !== undefined ? { storefrontBadge: data.badge } : {}),
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

export async function GET() {
  try {
    const session = await requireAuth();
    if (!can(session.role, "products.write")) return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    const [settings, products] = await Promise.all([getShopSettings(session.storeId), db.product.findMany({ where: { storeId: session.storeId, ...activeProductStatus }, orderBy: { title: "asc" }, include: { variants: { where: { active: true }, include: { recipes: { where: { active: true }, include: { versions: { where: { isCurrent: true }, include: { items: true } } } } } } } })]);
    return NextResponse.json({ data: { settings, products, owner: session.role === "OWNER", storeId: session.storeId, linked: process.env.STOREFRONT_STORE_ID === session.storeId } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
    console.error(error); return NextResponse.json({ error: "تعذر تحميل إدارة الموقع" }, { status: 500 });
  }
}
