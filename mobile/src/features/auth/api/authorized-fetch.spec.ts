import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuthStore } from '../stores/auth-store';
import { createAuthorizedFetch } from './authorized-fetch';

function serverAnswering(status: (token: string) => number) {
  const sent: string[] = [];
  const fetch = async (_url: unknown, init?: RequestInit) => {
    const token = (init?.headers as Record<string, string>).Authorization.replace('Bearer ', '');
    sent.push(token);
    return new Response(null, { status: status(token) });
  };
  return { sent, fetch };
}

function session(renewed: string | null = 'renewed') {
  const renewals: (string | undefined)[] = [];
  const store = {
    getState: () => ({
      freshAccessToken: async () => 'stale',
      renewAccessToken: async (rejected?: string) => {
        renewals.push(rejected);
        return renewed;
      },
    }),
  };
  return { renewals, store: store as unknown as AuthStore };
}

test('a request turned down as unauthorized renews its token and goes once more', async (t) => {
  const server = serverAnswering((token) => (token === 'stale' ? 401 : 200));
  t.mock.method(globalThis, 'fetch', server.fetch);
  const { renewals, store } = session();

  const response = await createAuthorizedFetch(store)('https://api.test/calls', { method: 'POST' });

  assert.equal(response.status, 200);
  assert.deepEqual(server.sent, ['stale', 'renewed']);
  assert.deepEqual(renewals, ['stale']);
});

test('a forbidden request is not a stale token: nothing is renewed', async (t) => {
  const server = serverAnswering(() => 403);
  t.mock.method(globalThis, 'fetch', server.fetch);
  const { renewals, store } = session();

  const response = await createAuthorizedFetch(store)('https://api.test/calls');

  assert.equal(response.status, 403);
  assert.deepEqual(server.sent, ['stale']);
  assert.deepEqual(renewals, []);
});

test('a 401 the session can not renew past comes back as it is, sent only once', async (t) => {
  const server = serverAnswering(() => 401);
  t.mock.method(globalThis, 'fetch', server.fetch);
  const { renewals, store } = session(null);

  const response = await createAuthorizedFetch(store)('https://api.test/calls');

  assert.equal(response.status, 401);
  assert.deepEqual(server.sent, ['stale']);
  assert.deepEqual(renewals, ['stale']);
});
