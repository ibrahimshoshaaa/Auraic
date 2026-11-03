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
import { trafficSchema, boundedTrafficBody } from '../src/lib/storefront/traffic.ts';
test('traffic rejects private routes, queries and oversized streamed bodies', async () => {
 const base={id:crypto.randomUUID(),session:crypto.randomUUID()};
 for(const path of ['/','/products','/products/variant-1','/checkout']) assert.equal(trafficSchema.safeParse({...base,path}).success,true);
 for(const path of ['/dashboard','/api/auth','/checkout?phone=123','//evil.com','/products/a/extra']) assert.equal(trafficSchema.safeParse({...base,path}).success,false);
 assert.equal(await boundedTrafficBody(new Request('http://localhost',{method:'POST',body:'x'.repeat(1025)})),null);
 assert.equal(await boundedTrafficBody(new Request('http://localhost',{method:'POST',body:'{}'})),'{}');
});
