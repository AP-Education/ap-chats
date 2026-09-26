import assert from 'node:assert/strict';
import { before, test } from 'node:test';

import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';

import { verifyAccessToken } from './access-token';

const policy = { issuer: 'https://accounts.example.test', audience: 'ap-chats' };
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let jwks: ReturnType<typeof createLocalJWKSet>;

before(async () => {
  const keyPair = await generateKeyPair('RS256');
  privateKey = keyPair.privateKey;
  const publicJwk = await exportJWK(keyPair.publicKey);
  jwks = createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] });
});

interface TokenOptions {
  issuer?: string;
  audience?: string;
  appId?: string | null;
  expiration?: string | null;
}

async function signToken({
  issuer = policy.issuer,
  audience = policy.audience,
  appId = 'web',
  expiration = '5m',
}: TokenOptions = {}) {
  const jwt = new SignJWT(appId === null ? {} : { appId })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject('user-123')
    .setIssuedAt();
  if (expiration) jwt.setExpirationTime(expiration);
  return jwt.sign(privateKey);
}

test('accepts a signed Accounts token for this API', async () => {
  assert.deepEqual(await verifyAccessToken(await signToken(), jwks, policy), {
    sub: 'user-123',
    appId: 'web',
  });
});

test('rejects a token from another issuer', async () => {
  await assert.rejects(
    verifyAccessToken(await signToken({ issuer: 'https://other.example.test' }), jwks, policy),
  );
});

test('rejects a token for another resource', async () => {
  await assert.rejects(verifyAccessToken(await signToken({ audience: 'other-api' }), jwks, policy));
});

test('rejects a token without expiration', async () => {
  await assert.rejects(verifyAccessToken(await signToken({ expiration: null }), jwks, policy));
});

test('rejects an expired token', async () => {
  await assert.rejects(verifyAccessToken(await signToken({ expiration: '-10m' }), jwks, policy));
});

test('rejects a token without an application identity', async () => {
  await assert.rejects(verifyAccessToken(await signToken({ appId: null }), jwks, policy));
});

test('rejects a token with a modified signature', async () => {
  const token = await signToken();
  const signatureStart = token.lastIndexOf('.') + 1;
  const firstCharacter = token[signatureStart];
  assert.ok(firstCharacter);
  const tampered = `${token.slice(0, signatureStart)}${firstCharacter === 'a' ? 'b' : 'a'}${token.slice(signatureStart + 1)}`;
  await assert.rejects(verifyAccessToken(tampered, jwks, policy));
});
