import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateCustomers, normalizeCustomerPhone } from '../src/lib/customers.ts';

test('Egyptian customer phones normalize local/international prefixes and both Arabic digit sets', () => {
  for (const number of ['01012345678', '+20 1012345678', '00201012345678', '٠١٠١٢٣٤٥٦٧٨', '۰۱۰۱۲۳۴۵۶۷۸']) {
    assert.equal(normalizeCustomerPhone(number), '201012345678');
  }
  assert.equal(normalizeCustomerPhone(null), null);
  assert.equal(normalizeCustomerPhone('123'), null);
  assert.equal(normalizeCustomerPhone('+44 7700 900123'), '447700900123');
});
const order = (id, phone, changes = {}) => ({ id, customerRef: 'Omar', customerPhone: phone,
  customerAddress: 'Cairo', occurredAt: new Date('2026-10-01'), currency: 'EGP', total: 450,
  refunded: 0, manualStatus: 'NEW', financialStatus: 'PENDING', ...changes });
test('one customer across channels; money includes only delivered orders after refunds and separates currencies', () => {
  const customers = aggregateCustomers([
    order('manual_1', '01012345678', { manualStatus: 'DELIVERED', refunded: 50 }),
    order('web_2', '+201012345678', { total: 1200, customerRef: 'Updated name', customerAddress: 'Giza', occurredAt: new Date('2026-10-02') }),
    order('manual_3', '٠١٠١٢٣٤٥٦٧٨', { manualStatus: 'RETURNED', total: 450, refunded: 450 }),
    order('other_currency', '01012345678', { total: 2.005, currency: 'USD', manualStatus: 'DELIVERED' }),
  ]);
  assert.equal(customers.length, 1);
  const c = customers[0];
  assert.equal(c.name, 'Updated name'); assert.equal(c.address, 'Giza');
  assert.equal(c.ordersCount, 4); assert.equal(c.deliveredCount, 2); assert.equal(c.returnedCount, 1);
  assert.deepEqual(c.totals.EGP, { orderValue: 210000, deliveredValue: 40000, refundedValue: 50000 });
  assert.deepEqual(c.totals.USD, { orderValue: 201, deliveredValue: 201, refundedValue: 0 });
});
test('missing phones never merge by customer name; grouping does not mutate order snapshots', () => {
  const orders = [order('one', null), order('two', ''), order('three', '123')];
  const before = structuredClone(orders);
  assert.equal(aggregateCustomers(orders).length, 3);
  assert.deepEqual(orders, before);
});

test('a processed partial return is counted once and does not double-count a returned order', () => {
  const c = aggregateCustomers([order('partial', '01012345678', { manualStatus: 'DELIVERED', refunded: 25, hasProcessedReturn: true }),
    order('full', '+201012345678', { manualStatus: 'RETURNED', hasProcessedReturn: true })])[0];
  assert.equal(c.returnedCount, 2); assert.equal(c.totals.EGP.deliveredValue, 42500);
});
