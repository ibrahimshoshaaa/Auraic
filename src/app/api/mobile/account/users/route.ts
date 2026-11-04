import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { accessKey, parsePermissions, permissionGroups, permissionDependencies, validatePermissions } from "@/lib/permissions";
import { effectivePermissions } from "@/lib/rbac";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

import { validNewPassword } from "@/lib/session-security";
import { allowPasswordConfirmation } from "@/lib/login-throttle";

const schema = z.object({
  permissions: z.array(z.string()).refine(validatePermissions),
  fullAccess: z.boolean().default(false),
  name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72).refine(validNewPassword, "Password must be 12+ characters and at most 72 UTF-8 bytes"), currentPassword: z.string().min(1).max(1024),
});

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.role !== "OWNER") return NextResponse.json({ error: "غير مسموح بإدارة المستخدمين" }, { status: 403 });
    const data = await db.user.findMany({ where: { storeId: session.storeId },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }, orderBy: { createdAt: "asc" } });
    const policies = await db.setting.findMany({ where: { storeId: session.storeId, key: { in: data.map(user => accessKey(user.id)) } }, select: { key: true, value: true } });
    const policyMap = new Map(policies.map(p => [p.key, p.value]));
    return NextResponse.json({ data: data.map(user => ({ ...user, permissions: effectivePermissions({ role: user.role, ...(policyMap.has(accessKey(user.id)) ? { permissions: parsePermissions(policyMap.get(accessKey(user.id))!) } : {}) }) })), permissionGroups, permissionDependencies }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "OWNER") return NextResponse.json({ error: "غير مسموح بإضافة مستخدم" }, { status: 403 });
    if (!await allowPasswordConfirmation(session.userId)) return NextResponse.json({ error: "محاولات كثيرة؛ حاول بعد ١٥ دقيقة" }, { status: 429 });
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "راجع الاسم والبريد وكلمة المرور (١٢ حرفًا على الأقل وبحد أقصى ٧٢ بايت)" }, { status: 422 });
    const actor = await db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { passwordHash: true } });
    if (!actor.passwordHash || !await compare(input.data.currentPassword, actor.passwordHash)) {
      return NextResponse.json({ error: "كلمة مرور حسابك الحالية غير صحيحة" }, { status: 403 });
    }
    const email = input.data.email.toLowerCase();
    const passwordHash = await hash(input.data.password, 12);
    const user = await db.$transaction(async tx => {
      const created = await tx.user.create({ data: { storeId: session.storeId, name: input.data.name,
        email, passwordHash, role: input.data.fullAccess ? "OWNER" : "EMPLOYEE", status: "ACTIVE" },
        select: { id: true, name: true, email: true, role: true, status: true } });
      if (!input.data.fullAccess) await tx.setting.create({ data: { storeId: session.storeId, key: accessKey(created.id), value: JSON.stringify(input.data.permissions) } });
      await tx.auditLog.create({ data: { storeId: session.storeId, userId: session.userId,
        action: "CREATE_USER", entity: "User", entityId: created.id,
        after: { email: created.email, role: created.role, permissions: input.data.permissions } } });
      return { ...created, permissions: input.data.fullAccess ? ["*"] : input.data.permissions };
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
    return failure(error);
  }
}

const updateSchema = z.object({
  userId: z.string().min(1), currentPassword: z.string().min(1).max(1024),
  permissions: z.array(z.string()).refine(validatePermissions),
});
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "OWNER") return NextResponse.json({ error: "غير مسموح بإدارة المستخدمين" }, { status: 403 });
    if (!await allowPasswordConfirmation(session.userId)) return NextResponse.json({ error: "محاولات كثيرة؛ حاول بعد ١٥ دقيقة" }, { status: 429 });
    const input = updateSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "راجع الصلاحيات المطلوبة والاختيارات المرتبطة بها" }, { status: 422 });
    const actor = await db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { passwordHash: true } });
    if (!actor.passwordHash || !await compare(input.data.currentPassword, actor.passwordHash)) return NextResponse.json({ error: "كلمة مرورك الحالية غير صحيحة" }, { status: 403 });
    const result = await db.$transaction(async tx => {
      // The target is bound to this store; full administrators cannot be demoted here.
      const target = await tx.user.findFirst({ where: { id: input.data.userId, storeId: session.storeId }, select: { id: true, role: true, name: true, email: true, status: true } });
      if (!target) return null;
      if (target.role === "OWNER") throw new Error("OWNER_PROTECTED");
      await tx.setting.upsert({ where: { storeId_key: { storeId: session.storeId, key: accessKey(target.id) } }, create: { storeId: session.storeId, key: accessKey(target.id), value: JSON.stringify(input.data.permissions) }, update: { value: JSON.stringify(input.data.permissions) } });
      await tx.mobileSession.updateMany({ where: { userId: target.id, storeId: session.storeId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { storeId: session.storeId, userId: session.userId, entity: "User", entityId: target.id, action: "UPDATE_PERMISSIONS", after: { permissions: input.data.permissions } } });
      return { ...target, permissions: input.data.permissions };
    });
    if (!result) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_PROTECTED") return NextResponse.json({ error: "صلاحيات حساب الأدمن الكامل محمية" }, { status: 409 });
    return failure(error);
  }
}

function failure(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401 });
  console.error("Account users failed", error);
  return NextResponse.json({ error: "تعذر إدارة المستخدمين" }, { status: 500 });
}
