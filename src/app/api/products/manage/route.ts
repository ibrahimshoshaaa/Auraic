import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { productEditorSchema, saveManagedProduct } from "@/services/product-editor.service";
import { revalidatePath } from "next/cache";
async function save(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.role, "products.write") || !can(session.role, "recipes.write")) return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    const parsed = productEditorSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "راجع بيانات المنتج", issues: parsed.error.issues }, { status: 422 });
    const data = await saveManagedProduct(session.storeId, session.userId, parsed.data);
    revalidatePath("/", "layout");
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "تغيرت البيانات أثناء الحفظ، حدّث الصفحة وحاول ثانية" }, { status: 409 });
    if (error instanceof Error && /غير موجود|غير متاحة|راجع السعر/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("Product editor failed", error);
    return NextResponse.json({ error: "تعذر حفظ المنتج" }, { status: 500 });
  }
}
export const POST = save;
export const PUT = save;
