export type WhatsAppOrder = { number: string; customer: string | null; address: string | null; currency: string; total: number; shipping: number; deposit: number; items: { title: string; quantity: number }[] };
export function orderWhatsAppUrl(phone: string | null, order: WhatsAppOrder) {
  if (!phone || !/^[1-9]\d{6,14}$/.test(phone)) return null;
  const money = (value: number) => `${Number(value.toFixed(2))} ${order.currency}`;
  const message = [`أهلًا ${order.customer?.trim() || 'بحضرتك'}، معاك Auraic 🌸`, `تفاصيل طلبك #${order.number.replace(/^#+/, '')}:`, ...order.items.map(item => `• ${item.title} × ${item.quantity}`), `الشحن: ${money(order.shipping)}`, `الإجمالي شامل الشحن: ${money(order.total)}`, ...(order.deposit > 0 ? [`الديبوزت المدفوع: ${money(order.deposit)}`, `المتبقي: ${money(Math.max(0, order.total - order.deposit))}`] : []), ...(order.address?.trim() ? [`عنوان التوصيل: ${order.address.trim()}`] : []), 'هل تحب تأكد الأوردر؟'].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
