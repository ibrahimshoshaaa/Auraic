import test from 'node:test';
import assert from 'node:assert/strict';
import { couponSchema, couponDiscount, CouponError } from '../src/lib/storefront/coupons.ts';
const rule = { ...couponSchema.parse({ code: ' auraic10 ', type: 'percent', value: 10 }), startsAt: null, expiresAt: null, usedCount: 0 };
const lines = [{ priceCents: 45000, quantity: 2, productId: 'p', sample: false, audience: 'men' }, { priceCents: 10000, quantity: 3, productId: 's', sample: true, audience: 'unisex' }];
test('coupon schema normalizes and rejects unsafe or inconsistent rules', () => {
 assert.equal(rule.code, 'AURAIC10');
 for (const change of [{ value: 101 }, { value: 0 }, { maxUses: 1.5 }, { minOrder: -1 }, { maxDiscount: 0 }, { startsAt: '2026-10-10T00:00:00Z', expiresAt: '2026-10-09T00:00:00Z' }]) assert.equal(couponSchema.safeParse({ ...rule, ...change }).success, false);
 assert.equal(couponSchema.safeParse({ ...rule, value: 0, freeShipping: true }).success, true);
});
test('percent, fixed and cap discount only eligible prices and allocate exact cents', () => {
 assert.deepEqual(couponDiscount(rule, lines), { discountCents: 12000, lineDiscounts: [9000, 3000], freeShipping: false });
 assert.equal(couponDiscount({ ...rule, scope: 'SAMPLES' }, lines).discountCents, 3000);
 assert.equal(couponDiscount({ ...rule, scope: 'WOMEN' }, lines).discountCents, 3000);
 assert.equal(couponDiscount({ ...rule, productId: 'p', maxDiscount: 50 }, lines).discountCents, 5000);
 assert.equal(couponDiscount({ ...rule, type: 'fixed', value: 1000, scope: 'SAMPLES' }, lines).discountCents, 30000);
 for (let value = 1; value <= 100; value++) {
  const out = couponDiscount({ ...rule, value }, lines.map((l, i) => ({ ...l, priceCents: 101 + i * 32 })));
  assert.equal(out.lineDiscounts.reduce((a,b) => a+b,0), out.discountCents);
 }
});
test('eligibility, schedules, expiry and usage limits are enforced', () => {
 const now = new Date('2026-10-04T00:00:00Z');
 for (const change of [{ active: false }, { startsAt: new Date('2026-10-05') }, { expiresAt: now }, { maxUses: 1, usedCount: 1 }, { minOrder: 1201 }, { minItems: 6 }, { productId: 'foreign' }, { scope: 'SAMPLES', minItems: 4 }]) assert.throws(() => couponDiscount({ ...rule, ...change }, lines, now), CouponError);
 assert.equal(couponDiscount({ ...rule, value: 0, freeShipping: true }, lines, now).freeShipping, true);
});
