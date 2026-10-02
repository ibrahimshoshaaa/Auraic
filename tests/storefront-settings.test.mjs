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
  assert.equal(settings.featuredTitle, 'Hand-picked\nby Auraic');
  assert.equal(settings.storyTitle, 'Our story');
});
