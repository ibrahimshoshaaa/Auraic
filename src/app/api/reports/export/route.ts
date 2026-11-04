import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { getBusinessReport } from "@/services/report.service";
import { exportFilename } from "@/lib/reports/export-data";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const headers={"Cache-Control":"private, no-store"};
  try {
    const session=await requireAuth();
    if(!can(session.role,"reports.read"))return NextResponse.json({error:"غير مسموح بتصدير التقارير"},{status:403,headers});
    const q=req.nextUrl.searchParams;const format=q.get("format");
    if(format!=="pdf"&&format!=="xlsx")return NextResponse.json({error:"اختر PDF أو Excel"},{status:422,headers});
    const report=await getBusinessReport(session.storeId,{period:q.get("period")??undefined,from:q.get("from")??undefined,to:q.get("to")??undefined});
    const bytes=format==="pdf"?await (await import("@/lib/reports/pdf")).reportPdf(report):await (await import("@/lib/reports/xlsx")).reportXlsx(report);
    return new Response(bytes,{headers:{...headers,"Content-Type":format==="pdf"?"application/pdf":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${exportFilename(report,format)}"`,"X-Content-Type-Options":"nosniff"}});
  } catch(error) {
    if(error instanceof Error&&error.message==="UNAUTHORIZED")return NextResponse.json({error:"سجّل الدخول أولًا"},{status:401,headers});
    if(error instanceof Error&&/Invalid (period|date range)/.test(error.message))return NextResponse.json({error:"الفترة غير صحيحة"},{status:422,headers});
    console.error("Report export failed",error);return NextResponse.json({error:"تعذر إنشاء التقرير. حاول مرة أخرى."},{status:503,headers});
  }
}
