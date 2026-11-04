import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { listReturns } from "@/services/finance.service";
export async function GET() {
  try { const s = await requireAuth(); if (!can(s, "returns.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); return NextResponse.json({ data: (await listReturns(s.storeId)).map(ret => ({ ...ret, returnCost: can(s, "costs.read") ? ret.returnCost : undefined, expense: can(s, "expenses.read") ? ret.expense : undefined })) }); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}
