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

test('governorate shipping uses its configured fee and preserves zero and fallback rates', async () => {
  const { shippingFeeFor, shopSettingsSchema, defaultShopSettings } = await import('../src/lib/storefront/config.ts');
  const settings = shopSettingsSchema.parse({ ...defaultShopSettings, shippingFee: 60, shippingRates: { 'القاهرة': 60, 'أسوان': 90, 'الجيزة': 0 } });
  assert.equal(shippingFeeFor(settings, 'أسوان'), 90);
  assert.equal(shippingFeeFor(settings, 'القاهرة'), 60);
  assert.equal(shippingFeeFor(settings, 'الجيزة'), 0);
  assert.equal(shippingFeeFor(settings, 'المنوفية'), 60);
  assert.equal(checkoutTotals([{ price: 500, quantity: 1 }], shippingFeeFor(settings, 'أسوان'), 0).totalCents, 59000);
  assert.equal(checkoutTotals([{ price: 1200, quantity: 1 }], shippingFeeFor(settings, 'أسوان'), 1200).shippingCents, 0);
  assert.equal(shopSettingsSchema.safeParse({ ...settings, shippingRates: { 'unknown': 90 } }).success, false);
  assert.equal(shopSettingsSchema.safeParse({ ...settings, shippingRates: { 'القاهرة': -1 } }).success, false);
  assert.deepEqual(shopSettingsSchema.parse(defaultShopSettings).shippingRates, {});
});
