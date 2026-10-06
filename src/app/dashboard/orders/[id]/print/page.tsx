import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { can } from '@/lib/rbac';
import { db } from '@/lib/db';
import { ShippingLabel } from '@/components/orders/ShippingLabel';
export default async function PrintOrder({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!can(session.role, 'orders.read')) notFound();
  const { id } = await params;
  const order = await db.order.findFirst({ where: { id, storeId: session.storeId }, include: { items: true } });
  if (!order) notFound();
  return <ShippingLabel order={{ number: order.orderNumber || order.id.slice(-8), customer: order.customerRef || 'غير متاح', phone: order.customerPhone || 'غير متاح', address: order.customerAddress || 'غير متاح', currency: order.currency, total: Number(order.total || 0), shipping: Number(order.shipping || 0), deposit: Number(order.depositAmount), manualStatus: order.manualStatus, financialStatus: order.financialStatus, items: order.items.map(i => ({ title: i.title, quantity: Number(i.quantity) })) }} />;
}
