import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultShopSettings, resolveShopSettings } from '../src/lib/storefront/config.ts';

test('retired default title resolves identically for public pages and management clients', () => {
  const legacy = { ...defaultShopSettings, heroTitle: 'عطرك… أثر لا يُنسى' };
  const resolved = resolveShopSettings(legacy);
  assert.equal(resolved.heroTitle, defaultShopSettings.heroTitle);
  assert.equal(legacy.heroTitle, 'عطرك… أثر لا يُنسى');
  assert.equal(resolveShopSettings({ ...legacy, heroTitle: 'عطر جديد', announcement: 'عرض جديد' }).heroTitle, 'عطر جديد');
  assert.equal(resolveShopSettings({ ...legacy, announcement: 'عرض جديد' }).announcement, 'عرض جديد');
});

test('older settings gain current homepage copy without replacing saved custom content', () => {
  const legacy = { ...defaultShopSettings };
  delete legacy.menCollectionLabel; delete legacy.featuredTitle;
  const settings = resolveShopSettings({ ...legacy, storyTitle: 'Our story' });
  assert.equal(settings.menCollectionLabel, 'SHOP FOR MEN');
  assert.equal(settings.featuredTitle, 'Best Sellers');
  assert.equal(settings.storyTitle, 'Our story');
});

test('fragrance metadata is optional for older clients and validates new admin values', async () => {
  const { productPresentationSchema } = await import('../src/lib/storefront/config.ts');
  const old = { id: 'product', published: true, featured: false, description: 'Vanilla', category: 'Unisex', images: [] };
  assert.equal(productPresentationSchema.parse(old).inspiredBy, '');
  assert.equal(productPresentationSchema.parse(old).scentFamily, '');
  const current = productPresentationSchema.parse({ ...old, inspiredBy: '  Kayali · Vanilla 28  ', scentFamily: '  Warm Sweet  ' });
  assert.equal(current.inspiredBy, 'Kayali · Vanilla 28');
  assert.equal(current.scentFamily, 'Warm Sweet');
  assert.equal(productPresentationSchema.safeParse({ ...old, inspiredBy: 'x'.repeat(161) }).success, false);
  assert.equal(productPresentationSchema.safeParse({ ...old, scentFamily: 'x'.repeat(81) }).success, false);
});

test('checkout accepts optional order notes and limits their size', async () => {
  const { checkoutSchema } = await import('../src/lib/storefront/config.ts');
  const input = { requestId: '11111111-1111-4111-8111-111111111111', name: 'Customer', expectedTotalCents: 10000, phone: '01012345678', governorate: 'القاهرة', address: 'Building 12, Main Street', items: [{ variantId: 'variant', quantity: 1 }] };
  assert.equal(checkoutSchema.parse(input).note, '');
  assert.equal(checkoutSchema.parse({ ...input, note: '  Call before delivery  ' }).note, 'Call before delivery');
  assert.equal(checkoutSchema.safeParse({ ...input, note: 'x'.repeat(501) }).success, false);
});
