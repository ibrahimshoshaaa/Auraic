import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCartItems } from '../src/lib/storefront/cart-items.ts';
test('selected samples merge repeated choices and preserve existing bag lines', () => {
  const original = [{ variantId: 'bottle', quantity: 1 }];
  assert.deepEqual(mergeCartItems(original, [{variantId:'sample',quantity:1},{variantId:'sample',quantity:1},{variantId:'other',quantity:1}]), [{variantId:'bottle',quantity:1},{variantId:'sample',quantity:2},{variantId:'other',quantity:1}]);
  assert.deepEqual(original, [{variantId:'bottle',quantity:1}]);
});
test('sample batches fail atomically at bag limits', () => {
  assert.equal(mergeCartItems([{variantId:'sample',quantity:19}], [{variantId:'sample',quantity:2}]), null);
  assert.equal(mergeCartItems(Array.from({length:20}, (_,i)=>({variantId:String(i),quantity:1})), [{variantId:'new',quantity:1}]), null);
  assert.equal(mergeCartItems([], [{variantId:'sample',quantity:0}]), null);
});
