// One-time accounts-only migration in Vercel's trusted build environment.
import { PrismaClient, Prisma } from '@prisma/client';
const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.env.NEON_MIGRATION_DATABASE_URL;
if (!sourceUrl || !targetUrl) throw new Error('Source and target connections are required');
const targetHost = new URL(targetUrl).hostname;
if (targetHost !== 'ep-old-surf-b7npi1sg.c-13.us-east-1.aws.neon.tech') throw new Error('Unexpected migration target');
if (new URL(sourceUrl).hostname.replace('-pooler.', '.') === targetHost) throw new Error('Source and target must differ');
const source = new PrismaClient({ datasourceUrl: sourceUrl, log: [] });
const target = new PrismaClient({ datasourceUrl: targetUrl, log: [] });
async function migrate() {
  const { stores, users } = await source.$transaction(async tx => ({
    stores: await tx.store.findMany(), users: await tx.user.findMany(),
  }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  if (!stores.length || !users.some(user => user.status === 'ACTIVE' && user.role === 'OWNER' && user.passwordHash && stores.some(store => store.id === user.storeId && store.status === 'ACTIVE')))
    throw new Error('Source requires an active owner with a password and active store');
  await target.$transaction(async tx => {
    for (const model of ['order', 'product', 'material', 'supplier', 'recipe', 'expense', 'coupon', 'setting', 'mobileSession', 'auditLog', 'return', 'consumption', 'inventoryTransaction', 'materialPurchase']) {
      if (await tx[model].count()) throw new Error('Destination contains business data');
    }
    const existingUsers = await tx.user.findMany();
    const existingStores = await tx.store.findMany();
    if (existingUsers.some(user => !users.some(original => original.id === user.id && original.email === user.email && original.passwordHash === user.passwordHash)) || existingStores.some(store => !stores.some(original => original.id === store.id)))
      throw new Error('Destination contains unrelated accounts');
    for (const store of stores) await tx.store.upsert({ where: { id: store.id }, create: store, update: store });
    for (const user of users) await tx.user.upsert({ where: { id: user.id }, create: user, update: user });
  }, { timeout: 30000 });
  const copiedUsers = await target.user.findMany();
  const copiedStores = await target.store.findMany();
  const sorted = rows => rows.slice().sort((a, b) => a.id.localeCompare(b.id));
  if (JSON.stringify(sorted(users)) !== JSON.stringify(sorted(copiedUsers)) || JSON.stringify(sorted(stores)) !== JSON.stringify(sorted(copiedStores))) throw new Error('Account verification failed');
  if (await target.order.count() || await target.product.count() || await target.expense.count()) throw new Error('Destination must start empty');
  console.log(`Accounts verified: ${users.length} users and ${stores.length} stores; business data is empty. Original database was not modified.`);
}
try { await migrate(); }
catch { console.error('Accounts-only migration failed. No credentials or account records are logged.'); process.exitCode = 1; }
finally { await Promise.all([source.$disconnect(), target.$disconnect()]); }
