import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createHmac } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// This test intentionally writes temporary records: never point it at production.
const database = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname));
assert.match(database.pathname, /test/i);
const db = new PrismaClient();

test('real web sessions revoke on password change; concurrent logins and reauthentication are bounded',
  { timeout: 120_000 }, async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    const url = `http://127.0.0.1:${port}`;
    const store = await db.store.create({ data: { name: 'Security HTTP test' } });
    const email = `security-${store.id}@example.com`;
    const password = 'temporary-security-test-password';
    let output = '';
    const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
      env: { ...process.env, AUTH_TRUST_HOST: 'true', VERCEL: '' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', data => { output += data.toString(); });
    child.stderr.on('data', data => { output += data.toString(); });
    const jsonHeaders = { 'content-type': 'application/json' };
    const login = (who, pass) => fetch(`${url}/api/mobile/auth/login`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: who, password: pass }) });
    try {
      await db.user.create({ data: { storeId: store.id, email, passwordHash: await hash(password, 10), role: 'OWNER', status: 'ACTIVE' } });
      for (let attempt = 0; attempt < 70; attempt++) {
        if (child.exitCode !== null) throw new Error(`Next exited: ${output}`);
        try { if ((await fetch(`${url}/login`)).status === 200) break; } catch { /* not listening yet */ }
        await delay(400);
      }
      const ipKey = createHmac('sha256', process.env.AUTH_SECRET).update('login-ip:untrusted-proxy').digest('hex');
      await db.loginThrottle.deleteMany({ where: { key: ipKey } });
      const csrf = await fetch(`${url}/api/auth/csrf`);
      assert.equal(csrf.status, 200);
      const csrfToken = (await csrf.json()).csrfToken;
      const csrfCookie = csrf.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
      const webLogin = await fetch(`${url}/api/auth/callback/credentials`, { method: 'POST', redirect: 'manual',
        headers: { cookie: csrfCookie, origin: url, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${url}/dashboard` }),
      });
      const cookie = webLogin.headers.getSetCookie().map(value => value.split(';')[0]).filter(value => value.startsWith('authjs.session-token')).join('; ');
      assert.ok(cookie, `No authenticated web session: ${webLogin.status}, ${webLogin.headers.get('location')}`);
      assert.equal((await fetch(`${url}/api/mobile/me`, { headers: { cookie } })).status, 200);
      assert.equal((await fetch(`${url}/api/materials`, { method: 'POST', headers: { cookie, origin: 'https://evil.example', ...jsonHeaders }, body: '{}' })).status, 403);
      assert.equal((await fetch(`${url}/api/materials`, { method: 'POST', headers: { cookie, origin: url, ...jsonHeaders }, body: '{}' })).status, 422);
      const mobile = await login(email, password);
      assert.equal(mobile.status, 200);
      const token = (await mobile.json()).data.token;
      const headers = { ...jsonHeaders, authorization: `Bearer ${token}` };
      const change = await fetch(`${url}/api/mobile/account/password`, { method: 'POST', headers,
        body: JSON.stringify({ currentPassword: password, newPassword: 'changed-security-test-password' }) });
      assert.equal(change.status, 200);
      assert.equal((await fetch(`${url}/api/mobile/me`, { headers: { cookie } })).status, 401);
      assert.equal((await fetch(`${url}/api/mobile/me`, { headers })).status, 401);
      const next = await login(email, 'changed-security-test-password');
      assert.equal(next.status, 200);
      const nextHeaders = { ...jsonHeaders, authorization: `Bearer ${(await next.json()).data.token}` };
      // Password change consumed one confirmation slot; four more are allowed.
      for (let attempt = 0; attempt < 4; attempt++) {
        assert.equal((await fetch(`${url}/api/mobile/account/password`, { method: 'POST', headers: nextHeaders,
          body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'another-secure-test-password' }) })).status, 403);
      }
      assert.equal((await fetch(`${url}/api/mobile/account/password`, { method: 'POST', headers: nextHeaders,
        body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'another-secure-test-password' }) })).status, 429);
      const unknown = `unknown-${store.id}@example.com`;
      const attempts = await Promise.all(Array.from({ length: 20 }, () => login(unknown, 'incorrect-password')));
      assert.equal(attempts.filter(response => response.status === 401).length, 10);
      assert.equal(attempts.filter(response => response.status === 429).length, 10);
      const page = await fetch(`${url}/login`);
      assert.equal(page.headers.get('x-frame-options'), 'DENY');
      assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(page.headers.get('x-powered-by'), null);
      assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    } finally {
      child.kill('SIGTERM');
      await delay(100);
      await db.store.delete({ where: { id: store.id } });
      await db.$disconnect();
    }
  });
