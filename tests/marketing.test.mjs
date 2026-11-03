import test from 'node:test';
import assert from 'node:assert/strict';
import { shopSettingsSchema, defaultShopSettings } from '../src/lib/storefront/config.ts';
test('old stores keep tracking disabled and malformed IDs cannot inject scripts', () => {
 const old = { ...defaultShopSettings }; delete old.metaPixelId; delete old.tiktokPixelId;
 const parsed = shopSettingsSchema.parse(old);
 assert.equal(parsed.metaPixelId, ''); assert.equal(parsed.tiktokPixelId, '');
 for (const id of ['<script>', '123\" onload=x', 'https://example.com']) assert.equal(shopSettingsSchema.safeParse({ ...defaultShopSettings, metaPixelId: id }).success, false);
 assert.equal(shopSettingsSchema.safeParse({ ...defaultShopSettings, metaPixelId: '123456789012345', tiktokPixelId: 'C123456789ABCDEFGHIJK' }).success, true);
});
