import assert from 'node:assert/strict';
import { test } from 'node:test';

import { enqueue, markFailed, restore, unsent, without } from './outbox.ts';

const input = (clientNonce: string) => ({ markdown: clientNonce, clientNonce });
const at = '2026-10-08T10:00:00.000Z';

test('a retry replaces its failed entry instead of adding a second one', () => {
  const failed = markFailed(enqueue([], input('a'), at), 'a');
  const retried = enqueue(failed, input('a'), at);

  assert.deepEqual(retried, [{ input: input('a'), createdAt: at, status: 'sending' }]);
});

test('a nonce history already holds is no longer unsent, whatever its request reported', () => {
  const entries = markFailed(enqueue(enqueue([], input('a'), at), input('b'), at), 'a');

  assert.deepEqual(
    unsent(entries, new Set(['a'])).map((entry) => entry.input.clientNonce),
    ['b'],
  );
});

test('settling removes only the acknowledged entry', () => {
  const entries = enqueue(enqueue([], input('a'), at), input('b'), at);

  assert.deepEqual(
    without(entries, 'a').map((entry) => entry.input.clientNonce),
    ['b'],
  );
});

test('after a reload every entry waits for a retry, and malformed ones are dropped', () => {
  const stored = [
    { input: input('a'), createdAt: at, status: 'sending' },
    { input: { markdown: 1 }, createdAt: at },
    'garbage',
  ];

  assert.deepEqual(restore(stored), [{ input: input('a'), createdAt: at, status: 'failed' }]);
  assert.deepEqual(restore({ not: 'a list' }), []);
});
