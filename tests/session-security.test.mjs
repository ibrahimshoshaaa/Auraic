import assert from 'node:assert/strict';
import test from 'node:test';
import { credentialVersion, credentialsMatch, validNewPassword } from '../src/lib/session-security.ts';

test('changing password or auth secret invalidates previously issued credentials', () => {
  const secret = 'test-secret-at-least-thirty-two-characters';
  const version = credentialVersion('original-bcrypt-hash', secret);
  assert.equal(credentialsMatch(version, 'original-bcrypt-hash', secret), true);
  assert.equal(credentialsMatch(version, 'replacement-bcrypt-hash', secret), false);
  assert.equal(credentialsMatch(version, 'original-bcrypt-hash', 'rotated-secret'), false);
  for (const invalid of [undefined, null, '', 'a'.repeat(63), 'z'.repeat(64)]) {
    assert.equal(credentialsMatch(invalid, 'original-bcrypt-hash', secret), false);
  }
  assert.equal(credentialsMatch(version, null, secret), false);
});

test('new bcrypt passwords respect the UTF-8 byte limit, including Arabic', () => {
  assert.equal(validNewPassword('a'.repeat(11)), false);
  assert.equal(validNewPassword('a'.repeat(12)), true);
  assert.equal(validNewPassword('a'.repeat(72)), true);
  assert.equal(validNewPassword('a'.repeat(73)), false);
  assert.equal(validNewPassword('ش'.repeat(36)), true);
  assert.equal(validNewPassword('ش'.repeat(37)), false);
});
