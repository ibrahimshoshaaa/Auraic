import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Exercise upgrade of an existing database, including retained business records.
test('integration removal preserves records and transfers order stages', async () => {
  const schema = `upgrade_${Date.now()}`;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('schema', schema);
  const admin = new PrismaClient();
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const directory = mkdtempSync(join(tmpdir(), 'auraic-upgrade-'));
  const migrations = join(directory, 'migrations');
  const finalMigration = '20261001233000_remove_external_commerce';
  const runMigrations = () => execFileSync(process.execPath,
    [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', join(directory, 'schema.prisma')],
    { env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'pipe' });
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    cpSync('prisma/schema.prisma', join(directory, 'schema.prisma'));
    cpSync('prisma/migrations', migrations, { recursive: true });
    rmSync(join(migrations, finalMigration), { recursive: true });
    runMigrations();
    const store = await db.store.create({ data: { name: 'Upgrade store' } });
    await db.$executeRaw`UPDATE "Store" SET "encryptedShopifyAccessToken" = 'old-token' WHERE id = ${store.id}`;
    const product = await db.product.create({ data: { storeId: store.id, title: 'Retained perfume', storefrontPublished: true } });
    const variant = await db.productVariant.create({ data: { storeId: store.id, productId: product.id, title: '30ml', price: 450 } });
    const order = await db.order.create({ data: { storeId: store.id, currency: 'EGP', occurredAt: new Date(), total: 900,
      financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', customerRef: 'Retained customer', customerPhone: '01000000000',
      items: { create: { variantId: variant.id, title: product.title, quantity: 2 } } } });
    const prepared = await db.order.create({ data: { storeId: store.id, currency: 'EGP', occurredAt: new Date() } });
    await db.$executeRaw`UPDATE "Order" SET "shopifyStage" = 'PREPARED' WHERE id = ${prepared.id}`;
    const returned = await db.return.create({ data: { storeId: store.id, orderId: order.id, status: 'PROCESSED', returnCost: 95 } });
    cpSync(join('prisma/migrations', finalMigration), join(migrations, finalMigration), { recursive: true });
    runMigrations();
    const saved = await db.order.findUnique({ where: { id: order.id }, include: { items: true } });
    assert.equal(saved.manualStatus, 'SHIPPING');
    assert.equal(saved.financialStatus, 'PAID');
    assert.equal(Number(saved.total), 900);
    assert.equal(saved.customerRef, 'Retained customer');
    assert.equal(saved.items.length, 1);
    assert.equal(saved.items[0].variantId, variant.id);
    assert.equal((await db.order.findUnique({ where: { id: prepared.id } })).manualStatus, 'PREPARED');
    assert.equal((await db.product.findUnique({ where: { id: product.id } })).storefrontPublished, true);
    assert.equal(Number((await db.return.findUnique({ where: { id: returned.id } })).returnCost), 95);
    const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = ${schema}`;
    assert.ok(!tables.some(row => ['ShopifyConnection', 'SyncJob', 'SyncState', 'WebhookEvent'].includes(row.table_name)));
    const columns = await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema}`;
    assert.ok(!columns.some(row => /shopify/i.test(row.column_name)));
  } finally {
    await db.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    rmSync(directory, { recursive: true, force: true });
  }
});
