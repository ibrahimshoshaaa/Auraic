import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-helpers";
import { hashMobileToken, parseMobileAuthorization } from "@/lib/mobile-token";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { pushConfigured } from "@/services/notifications/fcm";

async function currentSession(request: NextRequest) {
  const token = parseMobileAuthorization(request.headers.get("authorization"));
  if (!token) throw new Error("UNAUTHORIZED");
  const auth = await requireAuth();
  if (!can(auth.role, "orders.read")) throw new Error("UNAUTHORIZED");
  return db.mobileSession.findFirstOrThrow({ where: { tokenHash: hashMobileToken(token),
    userId: auth.userId, storeId: auth.storeId, revokedAt: null, expiresAt: { gt: new Date() } } });
}

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof Error && error.message === "UNAUTHORIZED"
    ? "سجّل الدخول أولًا" : "تعذر تحديث إعدادات الإشعارات" }, {
    status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500,
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await currentSession(request);
    return NextResponse.json({ data: { enabled: Boolean(session.pushToken), serverConfigured: pushConfigured() } });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await currentSession(request);
    if (Number(request.headers.get("content-length") || 0) > 4096) {
      return NextResponse.json({ error: "حجم الطلب كبير" }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "حجم الطلب كبير" }, { status: 413 });
    const parsed = z.object({ token: z.string().trim().min(20).max(2048).regex(/^[A-Za-z0-9_:\-]+$/) })
      .safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: "رمز الجهاز غير صالح" }, { status: 422 });
    await db.$transaction(async tx => {
      // A device belongs to its current signed-in account, never an old login.
      await tx.mobileSession.updateMany({ where: { pushToken: parsed.data.token }, data: { pushToken: null } });
      await tx.mobileSession.update({ where: { id: session.id },
        data: { pushToken: parsed.data.token, pushUpdatedAt: new Date() } });
    });
    return NextResponse.json({ data: { enabled: true, serverConfigured: pushConfigured() } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 422 });
    return failure(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await currentSession(request);
    await db.mobileSession.update({ where: { id: session.id }, data: { pushToken: null } });
    return NextResponse.json({ data: { enabled: false } });
  } catch (error) { return failure(error); }
}
