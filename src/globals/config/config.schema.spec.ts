import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';

import { normalizePem, validateConfig } from './config.schema';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const crlf = privateKey.replaceAll('\n', '\r\n');

test('reads an update signing key however its line breaks arrive', () => {
  for (const value of [
    privateKey,
    crlf,
    JSON.stringify(privateKey).slice(1, -1),
    JSON.stringify(crlf).slice(1, -1),
  ]) {
    const key = validateConfig({
      ...process.env,
      EXPO_UPDATES_PRIVATE_KEY: value,
    }).EXPO_UPDATES_PRIVATE_KEY;
    assert.equal(key, privateKey);
    assert.ok(createSign('RSA-SHA256').update('body').sign(key!, 'base64'));
  }
});

test('treats empty update settings as unset', () => {
  const config = validateConfig({
    ...process.env,
    EXPO_UPDATES_PRIVATE_KEY: '',
    UPDATES_ADMIN_TOKEN: '',
    UPDATES_MIN_BUILD_IOS: '',
    UPDATES_STORE_URL_IOS: '',
  });
  assert.equal(config.EXPO_UPDATES_PRIVATE_KEY, undefined);
  assert.equal(config.UPDATES_ADMIN_TOKEN, undefined);
  assert.equal(config.UPDATES_MIN_BUILD_IOS, undefined);
  assert.equal(config.UPDATES_STORE_URL_IOS, undefined);
});

test('rejects a short admin token', () => {
  assert.throws(() => validateConfig({ ...process.env, UPDATES_ADMIN_TOKEN: 'short' }));
});

test('keeps a PEM that is already clean unchanged', () => {
  assert.equal(normalizePem(privateKey), privateKey);
});
