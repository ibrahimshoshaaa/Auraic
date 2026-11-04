import { db } from "@/lib/db";
import { normalizeCustomerPhone } from "@/lib/customers";
import { matchReturnedOrders, type HistoryOrder } from "@/lib/return-history";
export async function getReturnWarnings(storeId: string, orders: Pick<HistoryOrder,"id"|"customerPhone"|"occurredAt">[]) {
  const eligible=orders.filter(x=>normalizeCustomerPhone(x.customerPhone));
  const result=new Map<string,{count:number;orders:ReturnType<typeof matchReturnedOrders>}>();
  if(!eligible.length)return result;
  const latest=new Date(Math.max(...eligible.map(x=>x.occurredAt.getTime())));
  const returned=await db.order.findMany({where:{storeId,manualStatus:"RETURNED",occurredAt:{lt:latest}},select:{id:true,orderNumber:true,customerPhone:true,occurredAt:true,currency:true,total:true}});
  for(const order of eligible){const matches=matchReturnedOrders(order,returned);result.set(order.id,{count:matches.length,orders:matches.slice(0,5)});}
  return result;
}
export async function getOrderReturnHistory(storeId: string, id: string) {
  const order=await db.order.findFirst({where:{id,storeId},select:{id:true,customerPhone:true,occurredAt:true}});
  if(!order)return null;
  if(!normalizeCustomerPhone(order.customerPhone))return [];
  const returned=await db.order.findMany({where:{storeId,manualStatus:"RETURNED",occurredAt:{lt:order.occurredAt}},select:{id:true,orderNumber:true,customerPhone:true,occurredAt:true,currency:true,total:true}});
  return matchReturnedOrders(order,returned);
}
