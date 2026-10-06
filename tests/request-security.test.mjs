import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedCookieMutation } from '../src/lib/request-security.ts';
const url = 'https://auraic.vercel.app/api/materials';
const cookie = '__Secure-authjs.session-token.0=session';
test('cookie-authenticated writes reject foreign, missing and opaque origins', () => {
  for (const origin of [undefined, 'null', 'https://evil.example', 'https://auraic.vercel.app.evil.example']) {
    const headers = { cookie, ...(origin ? { origin } : {}) };
    assert.equal(allowedCookieMutation(new Request(url, { method: 'POST', headers })), false);
  }
  assert.equal(allowedCookieMutation(new Request('https://internal.example/api/materials', { method: 'POST', headers: { cookie, host: 'auraic.vercel.app', origin: 'https://auraic.vercel.app' } })), true);
  assert.equal(allowedCookieMutation(new Request(url, { method: 'DELETE', headers: { cookie, origin: 'https://auraic.vercel.app' } })), true);
});
test('reads and explicit native bearer credentials remain usable', () => {
  assert.equal(allowedCookieMutation(new Request(url, { headers: { cookie } })), true);
  assert.equal(allowedCookieMutation(new Request(url, { method: 'POST', headers: { authorization: 'Bearer native-token' } })), true);
  assert.equal(allowedCookieMutation(new Request(url, { method: 'POST' })), true);
});
