import assert from 'node:assert/strict';
import { test } from 'node:test';

import { safeReturnTo } from './return-to';

test('returns to the requested conversation, preserving its query and anchor', () => {
  assert.equal(
    safeReturnTo({ returnTo: '/direct/channel?message=42#reply' }),
    '/direct/channel?message=42#reply',
  );
});

test('normalizes internal paths before checking for callback loops', () => {
  assert.equal(safeReturnTo({ returnTo: '/channels/../calls' }), '/calls');
  for (const returnTo of [
    '/auth/callback',
    '/auth/callback?code=used',
    '/channels/../auth/callback',
    '/channels/%2e%2e/auth/callback',
    '/%61uth/callback',
  ]) {
    assert.equal(safeReturnTo({ returnTo }), '/');
  }
});

test('untrusted, missing, and malformed destinations fall back to the app home', () => {
  for (const state of [
    undefined,
    null,
    {},
    { returnTo: 42 },
    { returnTo: 'https://other.test/direct/channel' },
    { returnTo: '//other.test/direct/channel' },
    { returnTo: '/\\other.test' },
    { returnTo: '/\n/other.test/channel' },
    { returnTo: '/bad%escape' },
  ]) {
    assert.equal(safeReturnTo(state), '/');
  }
});
