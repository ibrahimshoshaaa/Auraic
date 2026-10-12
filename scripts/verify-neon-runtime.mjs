// Private localhost verification inside the trusted Vercel build, never a public bypass link.
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
const db = new PrismaClient({ log: [] });
let sessionId;
let child;
try {
  assert.equal(new URL(process.env.DATABASE_URL).hostname.replace('-pooler.', '.'), 'ep-old-surf-b7npi1sg.c-13.us-east-1.aws.neon.tech');
  const owner = await db.user.findFirstOrThrow({ where: { role: 'OWNER', status: 'ACTIVE', store: { status: 'ACTIVE' } } });
  const token = `perf_${randomBytes(32).toString('base64url')}`;
  const session = await db.mobileSession.create({ data: { storeId: owner.storeId, userId: owner.id,
    tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60000) } });
  sessionId = session.id;
  const port = 3999;
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'],
    { stdio: 'ignore', env: { ...process.env, STOREFRONT_STORE_ID: owner.storeId } });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error('Private server stopped');
    try { const response = await fetch(`${base}/api/storefront/payment-options`); if (response.status === 200) { ready = true; break; } }
    catch { /* Private server is starting. */ }
    await delay(300);
  }
  assert.ok(ready);
  const headers = { authorization: `Bearer ${token}` };
  const me = await fetch(`${base}/api/mobile/me`, { headers }); assert.equal(me.status, 200);
  const profile = (await me.json()).data; assert.equal(profile.id, owner.id); assert.equal(profile.role, owner.role);
  const orders = await fetch(`${base}/api/mobile/orders`, { headers }); assert.equal(orders.status, 200); assert.equal((await orders.json()).count, 0);
  const settings = await fetch(`${base}/api/mobile/settings`, { headers }); assert.equal(settings.status, 200);
  assert.equal(await db.order.count(), 0); assert.equal(await db.product.count(), 0);
  console.log('Private runtime checks passed: account authorization, empty orders, settings and storefront database access.');
} catch { console.error('Private Neon runtime verification failed; credentials and account records are not logged.'); process.exitCode = 1; }
finally {
  child?.kill('SIGTERM');
  if (sessionId) await db.mobileSession.delete({ where: { id: sessionId } });
  await db.$disconnect();
}
