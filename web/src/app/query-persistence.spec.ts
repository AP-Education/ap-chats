import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QueryClient } from '@tanstack/react-query';

import { persistQueries } from './query-persistence';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  };
}

Object.assign(globalThis, { localStorage: memoryStorage(), __BUILD_ID__: 'build-1' });

async function visit(fetches: Record<string, unknown>) {
  const queryClient = new QueryClient();
  const forget = persistQueries(queryClient);
  for (const [name, data] of Object.entries(fetches)) {
    await queryClient.fetchQuery({
      queryKey: [name],
      queryFn: async () => data,
      meta: name === 'workspaces' ? { persist: true } : undefined,
    });
  }
  return forget;
}

test('the next visit starts with the marked queries of the last one, keeping their age so they refetch', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000 });

  await visit({ workspaces: [{ id: 'w1' }], messages: ['secret'] });
  t.mock.timers.tick(1_000);

  const next = new QueryClient();
  persistQueries(next);

  assert.deepEqual(next.getQueryData(['workspaces']), [{ id: 'w1' }]);
  assert.equal(next.getQueryData(['messages']), undefined);
  assert.equal(next.getQueryState(['workspaces'])?.dataUpdatedAt, 1_000);
});

test('a new build or a sign-out never restores saved data', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  await visit({ workspaces: [{ id: 'w1' }] });
  t.mock.timers.tick(1_000);
  Object.assign(globalThis, { __BUILD_ID__: 'build-2' });
  const afterDeploy = new QueryClient();
  persistQueries(afterDeploy);
  assert.equal(afterDeploy.getQueryData(['workspaces']), undefined);

  const forget = await visit({ workspaces: [{ id: 'w2' }] });
  t.mock.timers.tick(1_000);
  forget();
  const afterSignOut = new QueryClient();
  persistQueries(afterSignOut);
  assert.equal(afterSignOut.getQueryData(['workspaces']), undefined);
});
