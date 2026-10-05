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

test('sample cover is optional for legacy settings and keeps the configured artwork', async () => {
  const { shopSettingsSchema } = await import('../src/lib/storefront/config.ts');
  const old = { ...defaultShopSettings }; delete old.samplesImage;
  assert.equal(resolveShopSettings(old).samplesImage, '');
  assert.equal(resolveShopSettings({ ...old, samplesImage: 'https://example.com/cover.png' }).samplesImage, 'https://example.com/cover.png');
  assert.equal(shopSettingsSchema.safeParse({ ...defaultShopSettings, samplesImage: 'javascript:alert(1)' }).success, false);
});


test('announcement rotation validates messages and duration and supports old settings', async () => {
  const { shopSettingsSchema } = await import('../src/lib/storefront/config.ts');
  const old = { ...defaultShopSettings }; delete old.announcements; delete old.announcementInterval;
  assert.deepEqual(shopSettingsSchema.parse(old).announcements, []);
  assert.equal(shopSettingsSchema.parse(old).announcementInterval, 5);
  assert.equal(shopSettingsSchema.safeParse({ ...old, announcements: Array(11).fill('Offer') }).success, false);
  for (const announcementInterval of [0, 1, 61, 2.5]) assert.equal(shopSettingsSchema.safeParse({ ...old, announcementInterval }).success, false);
  assert.deepEqual(shopSettingsSchema.parse({ ...old, announcements: [' Offer ', 'Delivery'], announcementInterval: 2 }).announcements, ['Offer', 'Delivery']);
});

test('custom badges can be cleared and omitted by older clients without losing saved text', async () => {
  const { productPresentationSchema } = await import('../src/lib/storefront/config.ts');
  const product = { id: 'product', published: true, featured: false, description: '', category: 'Unisex', images: [] };
  assert.equal(productPresentationSchema.parse(product).badge, undefined);
  assert.equal(productPresentationSchema.parse({ ...product, badge: ' 20% OFF ' }).badge, '20% OFF');
  assert.equal(productPresentationSchema.parse({ ...product, badge: ' ' }).badge, '');
  assert.equal(productPresentationSchema.safeParse({ ...product, badge: 'x'.repeat(25) }).success, false);
});

test('announcement colors support old settings and reject invalid CSS values', async () => {
  const { shopSettingsSchema } = await import('../src/lib/storefront/config.ts');
  const old = { ...defaultShopSettings }; delete old.announcementBackground; delete old.announcementTextColor;
  assert.equal(shopSettingsSchema.parse(old).announcementBackground, '#3F3A60');
  assert.equal(shopSettingsSchema.parse(old).announcementTextColor, '#FAEAB1');
  assert.equal(shopSettingsSchema.parse({ ...old, announcementBackground: '#ff0000' }).announcementBackground, '#ff0000');
  assert.equal(shopSettingsSchema.safeParse({ ...old, announcementTextColor: 'red;position:fixed' }).success, false);
});


test('review sections default hidden, retain media while disabled and validate limits', () => {
  const legacy = { ...defaultShopSettings };
  for (const key of ['bloggerReviewsEnabled', 'bloggerReviewsTitle', 'bloggerReviewVideos', 'customerReviewsEnabled', 'customerReviewsTitle', 'customerReviewImages']) delete legacy[key];
  const settings = resolveShopSettings(legacy);
  assert.equal(settings.bloggerReviewsEnabled, false);
  assert.equal(settings.customerReviewsEnabled, false);
  assert.deepEqual(settings.bloggerReviewVideos, []);
  const saved = resolveShopSettings({ ...legacy, bloggerReviewsEnabled: false, bloggerReviewVideos: ['https://example.com/review.mp4'], customerReviewsEnabled: true, customerReviewImages: ['https://example.com/review.png'] });
  assert.equal(saved.bloggerReviewVideos.length, 1);
  assert.equal(saved.customerReviewsEnabled, true);
  assert.throws(() => resolveShopSettings({ ...saved, bloggerReviewVideos: ['http://example.com/review.mp4'] }));
  assert.throws(() => resolveShopSettings({ ...saved, customerReviewImages: Array(21).fill('https://example.com/review.png') }));
});
