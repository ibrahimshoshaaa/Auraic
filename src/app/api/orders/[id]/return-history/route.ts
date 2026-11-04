import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { getOrderReturnHistory } from "@/services/return-history.service";
export async function GET(_request: Request, context: {params:Promise<{id:string}>}) {
  const headers={"Cache-Control":"private, no-store"};
  try {
    const session=await requireAuth();if(!can(session.role,"orders.read"))return NextResponse.json({error:"Forbidden"},{status:403,headers});
    const history=await getOrderReturnHistory(session.storeId,(await context.params).id);
    return history===null?NextResponse.json({error:"الطلب غير موجود"},{status:404,headers}):NextResponse.json({data:history},{headers});
  } catch(error) {
    if(error instanceof Error&&error.message==="UNAUTHORIZED")return NextResponse.json({error:"Unauthorized"},{status:401,headers});
    console.error("Return history failed",error);return NextResponse.json({error:"تعذر تحميل سجل المرتجعات"},{status:503,headers});
  }
}
