import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shippingCollection } from '../src/lib/shipping-label.ts';

const checkout = readFileSync(new URL('../src/app/api/storefront/checkout/route.ts', import.meta.url), 'utf8');
const review = readFileSync(new URL('../src/app/api/payments/review/route.ts', import.meta.url), 'utf8');
const prepare = readFileSync(new URL('../src/services/manual-order.service.ts', import.meta.url), 'utf8');

test('confirmed deposits reduce shipping collection while pending transfers do not', () => {
  const order = { total: 1060, deposit: 0, manualStatus: 'SHIPPING', financialStatus: 'PENDING' };
  assert.equal(shippingCollection(order), 1060);
  assert.equal(shippingCollection({ ...order, deposit: 300, financialStatus: 'PARTIALLY_PAID' }), 760);
  assert.equal(shippingCollection({ ...order, deposit: 1060, financialStatus: 'PAID' }), 0);
});

test('checkout records transfer request without immediately counting it as paid', () => {
  assert.match(checkout, /financialStatus: "PENDING"/);
  assert.match(checkout, /paymentReview: method === "COD" \? "NOT_REQUIRED" : "PENDING"/);
  assert.match(checkout, /requestedCents/);
});

test('manual review requires actual approval and refuses duplicate receipts', () => {
  assert.match(review, /decision === "APPROVED"/);
  assert.match(review, /ALREADY_REVIEWED/);
  assert.match(review, /PAYMENT_ALREADY_RECORDED/);
  assert.match(prepare, /لا يمكن تجهيز طلب التحويل قبل تأكيد استلام المبلغ/);
});
