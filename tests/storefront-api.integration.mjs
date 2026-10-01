import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function freePort() { const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }

test('public orders validate server prices, tenant, publication and recipe; retries create one unpaid order', { timeout: 90000 }, async () => {
  const shop = await db.store.create({ data: { name: 'Auraic checkout test' } });
  const other = await db.store.create({ data: { name: 'Unrelated shop' } });
  const port = await freePort(); const url = `http://127.0.0.1:${port}`;
  let child; let output = '';
  try {
    await db.setting.create({ data: { storeId: shop.id, key: 'storefront', value: JSON.stringify({ enabled: true, announcement: 'Auraic', heroTitle: 'Test', heroSubtitle: '', heroImages: [], whatsapp: '', contactEmail: 'test@example.com', shippingFee: 45, freeShippingFrom: 1000, shippingPolicy: 'Test shipping', returnPolicy: 'Test returns' }) } });
    const type = await db.materialType.create({ data: { storeId: shop.id, name: 'Oils', code: 'OIL' } });
    const material = await db.material.create({ data: { storeId: shop.id, materialTypeId: type.id, name: 'Oil', unit: 'ml', baseUnit: 'ml' } });
    const product = await db.product.create({ data: { storeId: shop.id, title: 'Public perfume', storefrontPublished: true, status: 'ACTIVE', variants: { create: { storeId: shop.id, title: '30 ml', price: 250 } } }, include: { variants: true } });
    const variant = product.variants[0];
    await db.recipe.create({ data: { storeId: shop.id, variantId: variant.id, name: 'Perfume recipe', versions: { create: { storeId: shop.id, version: 1, isCurrent: true, items: { create: { materialId: material.id, quantity: 30, unit: 'ml' } } } } } });
    const foreign = await db.product.create({ data: { storeId: other.id, title: 'Foreign perfume', storefrontPublished: true, status: 'ACTIVE', variants: { create: { storeId: other.id, title: '50 ml', price: 100 } } }, include: { variants: true } });
    child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], { env: { ...process.env, NEXT_PUBLIC_APP_URL: url, STOREFRONT_ORIGIN: url, STOREFRONT_STORE_ID: shop.id }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => output += data.toString()); child.stderr.on('data', data => output += data.toString());
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) { if (child.exitCode !== null) throw new Error(output); try { const r = await fetch(url); if (r.ok) { ready = true; break; } } catch {} await delay(300); }
    assert.ok(ready, output);
    const headers = { 'content-type': 'application/json', origin: url };
    const order = { requestId: randomUUID(), expectedTotalCents: 54500, name: 'Test Customer', phone: '01012345678', governorate: 'المنوفية', address: 'Test Street, building 10', items: [{ variantId: variant.id, quantity: 2 }] };
    const post = data => fetch(`${url}/api/storefront/checkout`, { method: 'POST', headers, body: JSON.stringify(data) });
    assert.equal((await post({ ...order, expectedTotalCents: 1 })).status, 409);
    assert.equal((await post({ ...order, items: [{ variantId: foreign.variants[0].id, quantity: 1 }] })).status, 409);
    assert.equal((await fetch(`${url}/api/storefront/checkout`, { method: 'POST', headers: { ...headers, origin: 'https://foreign.example' }, body: JSON.stringify(order) })).status, 403);
    assert.equal((await fetch(`${url}/api/admin/storefront`, { method: 'PUT', headers, body: JSON.stringify({ kind: 'settings', data: {} }) })).status, 401);
    const first = await post(order); assert.equal(first.status, 201, await first.clone().text());
    const duplicate = await post(order); assert.equal(duplicate.status, 200);
    assert.deepEqual((await first.json()).data, (await duplicate.json()).data);
    const saved = await db.order.findUniqueOrThrow({ where: { id: `web_${order.requestId}` }, include: { items: true } });
    assert.equal(saved.storeId, shop.id); assert.equal(saved.manualStatus, 'NEW'); assert.equal(saved.financialStatus, 'PENDING');
    assert.equal(Number(saved.total), 545); assert.equal(Number(saved.shipping), 45); assert.equal(Number(saved.subtotal), 500); assert.equal(Number(saved.netSales), 500);
    assert.equal(saved.items.length, 1); assert.equal(Number(saved.items[0].originalPrice), 250); assert.equal(await db.order.count({ where: { id: saved.id } }), 1);
    assert.equal(await db.consumption.count({ where: { orderId: saved.id } }), 0);
    await db.product.update({ where: { id: product.id }, data: { storefrontPublished: false } });
    assert.equal((await post({ ...order, requestId: randomUUID() })).status, 409);
    await db.product.update({ where: { id: product.id }, data: { storefrontPublished: true } });
    await db.recipe.updateMany({ where: { variantId: variant.id }, data: { active: false } });
    assert.equal((await post({ ...order, requestId: randomUUID() })).status, 409);
  } finally {
    if (child) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); }
    await db.order.deleteMany({ where: { storeId: { in: [shop.id, other.id] } } });
    await db.recipeItem.deleteMany({ where: { recipeVersion: { storeId: shop.id } } });
    await db.store.deleteMany({ where: { id: { in: [shop.id, other.id] } } });
  }
});
test.after(async () => db.$disconnect());
