export type ShippingLabelOrder = {
  number: string; customer: string; phone: string; address: string; currency: string;
  total: number; shipping: number; deposit: number; manualStatus: string | null;
  financialStatus: string | null; items: { title: string; quantity: number }[];
};
export function shippingCollection(order: Pick<ShippingLabelOrder, 'total' | 'deposit' | 'manualStatus' | 'financialStatus'>) {
  if (['DELIVERED', 'RETURNED'].includes(order.manualStatus || '') || order.financialStatus === 'PAID') return 0;
  return Math.max(0, Math.round((order.total - order.deposit) * 100) / 100);
}
