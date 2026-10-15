import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type MutationKey, MutationObserver, QueryClient } from '@tanstack/react-query';

import { onRoleChanges, type RoleChange, roleChangeKey } from './role-changes';

function run(queryClient: QueryClient, mutationKey: MutationKey, outcome: 'succeeds' | 'fails') {
  const observer = new MutationObserver(queryClient, {
    mutationKey,
    mutationFn: async () => {
      if (outcome === 'fails') throw new Error('refused');
    },
  });
  return observer.mutate().catch(() => undefined);
}

test('features built on roles hear each role change that went through, and nothing else', async () => {
  const queryClient = new QueryClient();
  const heard: RoleChange[] = [];
  const stop = onRoleChanges(queryClient, (change) => heard.push(change));

  await run(queryClient, roleChangeKey('viewer', 'workspace'), 'succeeds');
  await run(queryClient, roleChangeKey('viewer', 'workspace'), 'fails');
  await run(queryClient, ['channels', 'viewer', 'workspace'], 'succeeds');
  stop();
  await run(queryClient, roleChangeKey('viewer', 'workspace'), 'succeeds');

  assert.deepEqual(heard, [{ identity: 'viewer', workspaceId: 'workspace' }]);
});
