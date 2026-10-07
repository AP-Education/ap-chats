import assert from 'node:assert/strict';
import { test } from 'node:test';

import { startValkey } from '@/testing/valkey-server';

import { ValkeyAttentionRepository } from './valkey-attention.repository';

test('attention lasts while any connection holds it', { timeout: 10000 }, async (t) => {
  const port = await startValkey(t);
  const attention = new ValkeyAttentionRepository({
    get: () => `redis://127.0.0.1:${port}/0`,
  } as never);
  t.after(() => attention.onModuleDestroy());

  await attention.update('user', 'tab-a', true);
  await attention.update('user', 'tab-b', true);
  await attention.update('user', 'tab-a', false);
  assert.equal(await attention.isAttending('user'), true, 'the other tab still holds it');

  await attention.update('user', 'tab-b', false);
  assert.equal(await attention.isAttending('user'), false);
  assert.equal(await attention.isAttending('someone-else'), false);
});

test('a connection that never says goodbye expires', { timeout: 10000 }, async (t) => {
  const port = await startValkey(t);
  const attention = new ValkeyAttentionRepository({
    get: () => `redis://127.0.0.1:${port}/0`,
  } as never);
  t.after(() => attention.onModuleDestroy());
  const now = Date.now();
  t.mock.method(Date, 'now', () => now);

  await attention.update('user', 'crashed-tab', true);
  assert.equal(await attention.isAttending('user'), true);

  t.mock.method(Date, 'now', () => now + 46_000);
  assert.equal(await attention.isAttending('user'), false);
});
