import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutTotals } from '../src/lib/storefront/pricing.ts';

test('checkout rounds each unit price before multiplying and adding shipping', () => {
  assert.deepEqual(checkoutTotals([{ price: 199.99, quantity: 3 }, { price: 0.1, quantity: 3 }], 45, 0),
    { subtotalCents: 60027, shippingCents: 4500, totalCents: 64527 });
});
test('free shipping threshold applies to product subtotal, including its exact boundary', () => {
  assert.equal(checkoutTotals([{ price: 499.99, quantity: 1 }], 50, 500).shippingCents, 5000);
  assert.equal(checkoutTotals([{ price: 250, quantity: 2 }], 50, 500).shippingCents, 0);
  assert.equal(checkoutTotals([{ price: 600, quantity: 1 }], 50, 0).shippingCents, 5000);
});
