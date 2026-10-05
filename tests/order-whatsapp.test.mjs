import test from 'node:test';
import assert from 'node:assert/strict';
import { orderWhatsAppUrl } from '../src/lib/order-whatsapp.ts';
import { normalizeCustomerPhone } from '../src/lib/customers.ts';
test('WhatsApp draft targets customer and includes order totals, deposit and address', () => {
 const order = { number: '#A-123', customer: 'إبراهيم', address: 'شما · المنوفية', currency: 'EGP', total: 1260, shipping: 60, deposit: 200, items: [{ title: 'No. 28 · 100 ml', quantity: 2 }] };
 const url = new URL(orderWhatsAppUrl(normalizeCustomerPhone('٠١٠٢٥٢٦٩٩٧٧'), order));
 assert.equal(url.pathname, '/201025269977');
 const text = url.searchParams.get('text');
 for (const detail of ['#A-123', 'إبراهيم', 'No. 28 · 100 ml × 2', '1260 EGP', '60 EGP', '200 EGP', '1060 EGP', 'شما · المنوفية', 'هل تحب تأكد الأوردر؟']) assert.ok(text.includes(detail), detail);
 assert.equal(orderWhatsAppUrl(null, order), null);
 assert.equal(orderWhatsAppUrl('123', order), null);
});

test('WhatsApp separates product value, shipping and discounted totals', () => {
 const base = { number: 'A-510', customer: null, address: null, currency: 'EGP', subtotal: 450, shipping: 60, total: 510, deposit: 0, items: [] };
 const message = order => new URL(orderWhatsAppUrl('201012345678', order)).searchParams.get('text');
 const text = message(base);
 for (const line of ['قيمة المنتجات: 450 EGP', 'الشحن: 60 EGP', 'الإجمالي شامل الشحن: 510 EGP']) assert.ok(text.includes(line), line);
 const discounted = message({ ...base, discount: 45, total: 465 });
 assert.ok(discounted.includes('الخصم: 45 EGP'));
 assert.ok(discounted.includes('الإجمالي شامل الشحن: 465 EGP'));
 const free = message({ ...base, shipping: 0, total: 450 });
 assert.ok(free.includes('الشحن: 0 EGP'));
 assert.ok(free.includes('الإجمالي شامل الشحن: 450 EGP'));
});
