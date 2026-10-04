import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { couponSchema } from "@/lib/storefront/coupons";
async function authorized() { const session = await requireAuth(); if (!can(session.role, "products.write")) throw new Error("FORBIDDEN"); return session; }
function failure(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
  if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "الكود مستخدم بالفعل" }, { status: 409 });
  console.error("Coupon management failed", error); return NextResponse.json({ error: "تعذر حفظ الكوبون" }, { status: 500 });
}
export async function GET() { try {
  const session = await authorized();
  const [coupons, products] = await Promise.all([db.coupon.findMany({ where: { storeId: session.storeId }, orderBy: { createdAt: "desc" } }), db.product.findMany({ where: { storeId: session.storeId }, select: { id: true, title: true }, orderBy: { title: "asc" } })]);
  return NextResponse.json({ data: { coupons: coupons.map(c => ({ ...c, value: Number(c.value), minOrder: Number(c.minOrder), maxDiscount: c.maxDiscount === null ? null : Number(c.maxDiscount) })), products } }, { headers: { "Cache-Control": "no-store" } });
} catch (error) { return failure(error); } }
async function save(request: NextRequest, editing: boolean) { try {
  const session = await authorized(); const body = await request.json();
  const parsed = couponSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const data = parsed.data;
  if (data.productId && !await db.product.findFirst({ where: { storeId: session.storeId, id: data.productId } })) return NextResponse.json({ error: "المنتج غير موجود" }, { status: 422 });
  const saved = { ...data, startsAt: data.startsAt ? new Date(data.startsAt) : null, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null };
  await db.$transaction(async tx => {
    let id: string;
    if (editing) {
      if (typeof body.id !== "string") throw new Error("NOT_FOUND");
      const changed = await tx.coupon.updateMany({ where: { id: body.id, storeId: session.storeId }, data: saved });
      if (!changed.count) throw new Error("NOT_FOUND"); id = body.id;
    } else id = (await tx.coupon.create({ data: { ...saved, storeId: session.storeId } })).id;
    await tx.auditLog.create({ data: { storeId: session.storeId, userId: session.userId, action: editing ? "UPDATE" : "CREATE", entity: "Coupon", entityId: id, metadata: { code: data.code } } });
  });
  return NextResponse.json({ data: { saved: true } }, { status: editing ? 200 : 201 });
} catch (error) { if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "الكوبون غير موجود" }, { status: 404 }); return failure(error); } }
export async function POST(request: NextRequest) { return save(request, false); }
export async function PUT(request: NextRequest) { return save(request, true); }
export async function DELETE(request: NextRequest) { try {
  const session = await authorized(); const id = request.nextUrl.searchParams.get("id") || "";
  const changed = await db.coupon.deleteMany({ where: { id, storeId: session.storeId } });
  return NextResponse.json(changed.count ? { data: { deleted: true } } : { error: "الكوبون غير موجود" }, { status: changed.count ? 200 : 404 });
} catch (error) { return failure(error); } }
