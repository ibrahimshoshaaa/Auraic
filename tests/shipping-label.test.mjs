import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingCollection } from '../src/lib/shipping-label.ts';
test('shipping label collects final total including shipping, less deposit', () => {
  const order = { total: 510, deposit: 0, manualStatus: 'SHIPPING', financialStatus: 'PENDING' };
  assert.equal(shippingCollection(order), 510);
  assert.equal(shippingCollection({ ...order, deposit: 100 }), 410);
  assert.equal(shippingCollection({ ...order, total: 390 }), 390);
  assert.equal(shippingCollection({ ...order, deposit: 600 }), 0);
  assert.equal(shippingCollection({ ...order, manualStatus: 'DELIVERED' }), 0);
  assert.equal(shippingCollection({ ...order, manualStatus: 'RETURNED' }), 0);
  assert.equal(shippingCollection({ ...order, financialStatus: 'PAID' }), 0);
});
