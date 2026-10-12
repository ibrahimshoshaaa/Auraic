import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderDiscount } from '../src/lib/order-discount.ts';
const original = { total: 1000, discount: 100, adminDiscount: 0, deposit: 150,
  items: [{ finalLinePrice: 600, discount: 60, adminDiscount: 0 }, { finalLinePrice: 340, discount: 40, adminDiscount: 0 }] };
test('additional discount reduces total, preserves coupon and leaves shipping intact', () => {
  const result = calculateOrderDiscount({ ...original, amount: 100 });
  assert.equal(result.total, 900); assert.equal(result.discount, 200);
  assert.equal(result.items.reduce((sum, item) => sum + Math.round(item.adminDiscount * 100), 0), 10000);
  assert.equal(result.items.reduce((sum, item) => sum + Math.round(item.finalLinePrice * 100), 0), 84000);
});
test('repeated saves, replacement and clearing never compound the admin discount', () => {
  const first = calculateOrderDiscount({ ...original, amount: 100.01 });
  const again = calculateOrderDiscount({ ...first, deposit: original.deposit, amount: 100.01 });
  assert.deepEqual(again, first);
  const changed = calculateOrderDiscount({ ...first, deposit: original.deposit, amount: 50 });
  assert.equal(changed.total, 950);
  const cleared = calculateOrderDiscount({ ...changed, deposit: original.deposit, amount: 0 });
  assert.equal(cleared.total, original.total); assert.equal(cleared.discount, original.discount);
  assert.deepEqual(cleared.items, original.items);
});
test('rejects invalid precision, excess discount and totals below collected deposit', () => {
  for (const amount of [-1, NaN, Infinity, 0.001, 941]) assert.throws(() => calculateOrderDiscount({ ...original, amount }));
  assert.throws(() => calculateOrderDiscount({ ...original, amount: 900 }));
  assert.equal(calculateOrderDiscount({ ...original, amount: 850 }).total, 150);
});
