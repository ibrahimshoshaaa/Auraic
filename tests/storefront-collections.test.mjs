import test from 'node:test';
import assert from 'node:assert/strict';
import { productAudience, matchesAudience, hasOffer } from '../src/lib/storefront/collections.ts';
test('unisex joins both audiences; gender collections exclude the other gender', () => {
  assert.equal(productAudience('رجالي'), 'men');
  assert.equal(productAudience('Women'), 'women');
  assert.ok(matchesAudience('Unisex', 'men')); assert.ok(matchesAudience('Unisex', 'women'));
  assert.equal(matchesAudience('Men', 'women'), false); assert.equal(matchesAudience('Women', 'men'), false);
  assert.equal(matchesAudience('Men', 'unisex'), false);
});
test('offers require a real discount on at least one size', () => {
  assert.ok(hasOffer({ variants: [{price: 1200, compareAtPrice: null}, {price: 450, compareAtPrice: 550}] }));
  assert.equal(hasOffer({ variants: [{price: 450, compareAtPrice: 450}] }), false);
  assert.equal(hasOffer({ variants: [{price: 450, compareAtPrice: null}] }), false);
});

test('samples stay out of both audience collections', async () => {
  const { isSample } = await import('../src/lib/storefront/collections.ts');
  assert.equal(isSample('Samples'), true);
  assert.equal(isSample(' samples '), true);
  assert.equal(isSample('Unisex'), false);
  assert.equal(matchesAudience('Samples', 'men'), false);
  assert.equal(matchesAudience('Samples', 'women'), false);
  assert.equal(matchesAudience('Samples', 'unisex'), false);
});
