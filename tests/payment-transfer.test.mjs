import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shippingCollection } from '../src/lib/shipping-label.ts';

const checkout = readFileSync(new URL('../src/app/api/storefront/checkout/route.ts', import.meta.url), 'utf8');
const review = readFileSync(new URL('../src/app/api/payments/review/route.ts', import.meta.url), 'utf8');
const returns = readFileSync(new URL('../src/services/finance.service.ts', import.meta.url), 'utf8');
const refundConfirm = readFileSync(new URL('../src/app/api/payments/refund-confirm/route.ts', import.meta.url), 'utf8');
const report = readFileSync(new URL('../src/services/report.service.ts', import.meta.url), 'utf8');
const mobileSettings = readFileSync(new URL('../src/app/api/mobile/settings/route.ts', import.meta.url), 'utf8');
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
  assert.match(checkout, /method !== "COD" && \(!Number\.isInteger\(depositAmount\)/);
  assert.match(checkout, /depositAmount \* 100/);
  assert.match(checkout, /input.receiptId !== expected/);
});

test('manual review requires actual approval and refuses duplicate receipts', () => {
  assert.match(review, /decision === "APPROVED"/);
  assert.match(review, /ALREADY_REVIEWED/);
  assert.match(review, /PAYMENT_ALREADY_RECORDED/);
  assert.match(prepare, /لا يمكن تجهيز طلب التحويل قبل تأكيد استلام المبلغ/);
});

test('cash report recognizes verified transfers on review date', () => {
  assert.match(report, /entity: "PaymentReview", action: "REVIEW", createdAt: between/);
  assert.match(report, /meta.decision !== "APPROVED"/);
  assert.match(report, /transferOrderIds.has\(order.id\)/);
  assert.match(report, /currency: store.currency, id: \{ in: reviewedIds \}/);
  assert.match(report, /eligibleReviewIds.has\(review.entityId\)/);
});

test('mobile settings require transfer destination for enabled methods', () => {
  assert.match(mobileSettings, /input.paymentInstaPayEnabled && !input.paymentInstaPayAddress/);
  assert.match(mobileSettings, /input.paymentWalletEnabled && !input.paymentWalletNumber/);
});

test('return does not report refund as paid until payout confirmation', () => {
  assert.match(returns, /financialStatus: needsRefund \? "REFUND_PENDING" : "VOIDED"/);
  assert.match(returns, /refunded: 0, netSales: 0/);
  assert.match(refundConfirm, /financialStatus !== "REFUND_PENDING"/);
  assert.match(refundConfirm, /financialStatus: "REFUNDED"/);
  assert.match(refundConfirm, /REFUND_CONFIRMED/);
  assert.match(refundConfirm, /pg_advisory_xact_lock/);
});

test('refund confirmation is available in both admin clients and requires transaction reference', () => {
  const refundList = readFileSync(new URL('../src/app/api/payments/refunds/route.ts', import.meta.url), 'utf8');
  const webPayments = readFileSync(new URL('../src/app/dashboard/payments/page.tsx', import.meta.url), 'utf8');
  const flutterPayments = readFileSync(new URL('../mobile/lib/payment_reviews.dart', import.meta.url), 'utf8');
  assert.match(refundList, /financialStatus: "REFUND_PENDING"/);
  assert.match(refundList, /\["OWNER", "MANAGER"\]/);
  assert.match(refundConfirm, /reference: z\.string\(\)\.trim\(\)\.min\(3\)/);
  assert.match(webPayments, /\/api\/payments\/refund-confirm/);
  assert.match(flutterPayments, /\/api\/payments\/refund-confirm/);
  assert.match(webPayments, /window\.confirm\("هل تأكدت من إرسال المبلغ/);
  assert.match(flutterPayments, /'reference': reference/);
});
