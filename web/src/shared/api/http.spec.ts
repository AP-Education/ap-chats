import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { ApiError, apiRequest, setApiAuthSession } from './http.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  setApiAuthSession(null);
});

test('a 401 renews the token and retries the original request once', async () => {
  const tokens: (string | null)[] = [];
  let refreshes = 0;
  setApiAuthSession({
    identity: 'user-one',
    token: 'expired',
    refresh: async () => {
      refreshes++;
      return 'renewed';
    },
  });
  globalThis.fetch = async (_url, init) => {
    tokens.push(new Headers(init?.headers).get('Authorization'));
    return new globalThis.Response(JSON.stringify({ ok: true }), {
      status: tokens.length === 1 ? 401 : 200,
    });
  };

  assert.deepEqual(await apiRequest('/api/example', 'expired'), { ok: true });
  assert.deepEqual(tokens, ['Bearer expired', 'Bearer renewed']);
  assert.equal(refreshes, 1);
});

test('concurrent 401 responses share one renewal', async () => {
  let refreshes = 0;
  setApiAuthSession({
    identity: 'user-two',
    token: 'old',
    refresh: async () => {
      refreshes++;
      await Promise.resolve();
      return 'new';
    },
  });
  globalThis.fetch = async (_url, init) =>
    new globalThis.Response(
      JSON.stringify({ token: new Headers(init?.headers).get('Authorization') }),
      {
        status: new Headers(init?.headers).get('Authorization') === 'Bearer old' ? 401 : 200,
      },
    );

  const results = await Promise.all([apiRequest('/api/one', 'old'), apiRequest('/api/two', 'old')]);
  assert.deepEqual(results, [{ token: 'Bearer new' }, { token: 'Bearer new' }]);
  assert.equal(refreshes, 1);
});

test('a second 401 is returned without renewing again', async () => {
  let calls = 0;
  let refreshes = 0;
  setApiAuthSession({
    identity: 'user-three',
    token: 'bad',
    refresh: async () => {
      refreshes++;
      return 'still-bad';
    },
  });
  globalThis.fetch = async () => {
    calls++;
    return new globalThis.Response(null, { status: 401 });
  };

  await assert.rejects(apiRequest('/api/example', 'bad'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    return true;
  });
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
});
