import { normalizeCustomerPhone } from "./customers";
export type HistoryOrder = { id: string; orderNumber: string | null; customerPhone: string | null; occurredAt: Date; currency: string; total: unknown };
export function matchReturnedOrders(target: Pick<HistoryOrder,"id"|"customerPhone"|"occurredAt">, returned: HistoryOrder[]) {
  const phone=normalizeCustomerPhone(target.customerPhone);
  if(!phone)return [];
  return returned.filter(order=>order.id!==target.id&&order.occurredAt<target.occurredAt&&normalizeCustomerPhone(order.customerPhone)===phone)
    .sort((a,b)=>b.occurredAt.getTime()-a.occurredAt.getTime()||a.id.localeCompare(b.id))
    .map(order=>({id:order.id,number:order.orderNumber||order.id.slice(-8),date:order.occurredAt.toISOString(),dateLabel:new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeZone:"Africa/Cairo"}).format(order.occurredAt),currency:order.currency,total:Number(order.total??0)}));
}
