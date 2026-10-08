import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { z } from "zod";

export async function GET() {
  const session = await requireAuth();
  if (!["OWNER", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ data: { depositAmount: Number(await getSetting(session.storeId, "paymentDepositAmount")), canEdit: session.role === "OWNER" } }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: NextRequest) {
  const session = await requireAuth();
  if (session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ depositAmount: z.number().int().min(1).max(1000000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid deposit amount" }, { status: 422 });
  const value = String(parsed.data.depositAmount);
  await db.$transaction(async tx => {
    const previous = await tx.setting.findUnique({ where: { storeId_key: { storeId: session.storeId, key: "paymentDepositAmount" } } });
    await tx.setting.upsert({ where: { storeId_key: { storeId: session.storeId, key: "paymentDepositAmount" } }, update: { value }, create: { storeId: session.storeId, key: "paymentDepositAmount", value } });
    if (previous?.value !== value) await tx.auditLog.create({ data: { storeId: session.storeId, userId: session.userId, action: "UPDATE", entity: "Setting", entityId: "paymentDepositAmount", before: { value: previous?.value ?? null }, after: { value } } });
  });
  return NextResponse.json({ data: { depositAmount: parsed.data.depositAmount } });
}
