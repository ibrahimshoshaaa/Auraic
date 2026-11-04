import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { getTrafficReport } from "@/services/storefront/traffic-report";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const session = await requireAuth();
    if (!can(session, "traffic.read")) return NextResponse.json({ error: "غير مسموح بعرض إحصائيات الزيارات" }, { status: 403, headers });
    const days = request.nextUrl.searchParams.get("days") ?? "7";
    if (!["1", "7", "30", "90"].includes(days)) return NextResponse.json({ error: "اختر فترة 1 أو 7 أو 30 أو 90 يومًا" }, { status: 422, headers });
    const report = await getTrafficReport(session.storeId, days);
    const formatter = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    const format = (date: Date | null) => date ? formatter.format(date) : null;
    return NextResponse.json({ data: { ...report, timeZone: "Africa/Cairo", display: {
      from: format(report.range.from), to: format(report.range.to), updatedAt: format(report.range.to),
      collectionStarted: format(report.collectionStarted), lastVisit: format(report.lastVisit),
    }, pages: report.pages.map(page => ({ ...page, lastSeenLabel: format(page.lastSeen) })) } }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "سجّل الدخول أولًا" }, { status: 401, headers });
    console.error("Traffic report failed", error);
    return NextResponse.json({ error: "تعذر تحميل إحصائيات الزيارات. حاول مرة أخرى." }, { status: 503, headers });
  }
}
