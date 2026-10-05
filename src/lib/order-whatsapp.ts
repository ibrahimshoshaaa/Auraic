export type WhatsAppOrder = { number: string; customer: string | null; address: string | null; currency: string; total: number; shipping: number; subtotal?: number; discount?: number; tax?: number; deposit: number; items: { title: string; quantity: number }[] };
export function orderWhatsAppUrl(phone: string | null, order: WhatsAppOrder) {
  if (!phone || !/^[1-9]\d{6,14}$/.test(phone)) return null;
  const money = (value: number) => `${Number(value.toFixed(2))} ${order.currency}`;
  const discount = order.discount ?? 0;
  const tax = order.tax ?? 0;
  const subtotal = order.subtotal ?? Math.max(0, order.total - order.shipping - tax + discount);
  const message = [`أهلًا ${order.customer?.trim() || 'بحضرتك'}، معاك Auraic 🌸`, `تفاصيل طلبك #${order.number.replace(/^#+/, '')}:`, ...order.items.map(item => `• ${item.title} × ${item.quantity}`), `قيمة المنتجات: ${money(subtotal)}`, ...(discount > 0 ? [`الخصم: ${money(discount)}`] : []), `الشحن: ${money(order.shipping)}`, ...(tax > 0 ? [`الضريبة: ${money(tax)}`] : []), `الإجمالي شامل الشحن: ${money(order.total)}`, ...(order.deposit > 0 ? [`الديبوزت المدفوع: ${money(order.deposit)}`, `المتبقي: ${money(Math.max(0, order.total - order.deposit))}`] : []), ...(order.address?.trim() ? [`عنوان التوصيل: ${order.address.trim()}`] : []), 'هل تحب تأكد الأوردر؟'].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
