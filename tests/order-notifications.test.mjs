import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { sendPush, invalidDeviceToken } from '../src/services/notifications/fcm.ts';

test('FCM signs OAuth assertions, sends order deep links, and distinguishes invalid devices from transient failures', async t => {
  const originalFetch = globalThis.fetch;
  const originalConfig = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalConfig === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalConfig;
  });
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: 'test-project',
    client_email: 'test@test-project.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  });
  let oauthRequests = 0;
  let sendStatus = 200;
  globalThis.fetch = async (url, options) => {
    if (url.includes('oauth2')) {
      oauthRequests++;
      const [header, claims, signature] = options.body.get('assertion').split('.');
      assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${claims}`), publicKey,
        Buffer.from(signature, 'base64url')), true);
      const payload = JSON.parse(Buffer.from(claims, 'base64url'));
      assert.equal(payload.scope, 'https://www.googleapis.com/auth/firebase.messaging');
      assert.equal(payload.exp - payload.iat, 3600);
      return Response.json({ access_token: 'test-access', expires_in: 3600 });
    }
    assert.equal(url, 'https://fcm.googleapis.com/v1/projects/test-project/messages:send');
    assert.equal(options.headers.Authorization, 'Bearer test-access');
    const { message } = JSON.parse(options.body);
    assert.equal(message.token, 'test-device');
    assert.equal(message.data.orderId, 'web_order');
    assert.equal(message.android.notification.tag, 'web_order');
    assert.equal(message.android.notification.sound, 'default');
    return sendStatus === 200 ? Response.json({ name: 'message-id' }) : Response.json({
      error: { details: [{ errorCode: sendStatus === 404 ? 'UNREGISTERED' : 'UNAVAILABLE' }] },
    }, { status: sendStatus });
  };
  const message = { title: 'New order', body: 'Open app', data: { type: 'new_order', orderId: 'web_order' }, tag: 'web_order' };
  assert.equal(await sendPush('test-device', message), 'sent');
  sendStatus = 404;
  assert.equal(await sendPush('test-device', message), 'invalid');
  sendStatus = 503;
  await assert.rejects(() => sendPush('test-device', message), /503/);
  assert.equal(oauthRequests, 1, 'Reuse short-lived OAuth token');
  assert.equal(invalidDeviceToken({ error: { details: [{ errorCode: 'INVALID_ARGUMENT' }] } }), false);
  assert.equal(invalidDeviceToken(null), false);
});
