import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { validatePushSubscription } from './push-endpoint';

const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url');
const auth = Buffer.alloc(16, 1).toString('base64url');
for (const endpoint of [
  'https://fcm.googleapis.com/fcm/send/token',
  'https://updates.push.services.mozilla.com/wpush/v2/token',
  'https://web.push.apple.com/token',
]) {
  test(`allows provider-owned endpoint ${new URL(endpoint).hostname}`, () =>
    assert.doesNotThrow(() => validatePushSubscription(endpoint, key, auth)));
}
for (const endpoint of [
  'http://fcm.googleapis.com/push',
  'https://127.0.0.1/private',
  'https://localhost/admin',
  'https://fcm.googleapis.com.attacker.test/push',
  'https://user:password@fcm.googleapis.com/push',
  'https://fcm.googleapis.com:444/push',
  'not a URL',
]) {
  test(`rejects unsafe endpoint ${endpoint}`, () =>
    assert.throws(() => validatePushSubscription(endpoint, key, auth), BadRequestException));
}
test('rejects invalid encryption key lengths', () => {
  assert.throws(
    () => validatePushSubscription('https://fcm.googleapis.com/push', 'invalid', auth),
    BadRequestException,
  );
  assert.throws(
    () => validatePushSubscription('https://fcm.googleapis.com/push', key, 'short'),
    BadRequestException,
  );
});
