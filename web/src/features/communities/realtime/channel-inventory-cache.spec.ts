import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QueryClient, QueryObserver } from '@tanstack/react-query';

import { communityQueryKeys } from '../queryKeys';
import { refreshChannelInventory } from './channel-inventory-cache';

function fixture() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

test('a remote creation refreshes another member list and its categories while preserving membership', async () => {
  const queryClient = fixture();
  const key = communityQueryKeys.channels('other-member', 'workspace', 'available');
  const categoryKey = communityQueryKeys.categories('other-member', 'workspace');
  const otherWorkspaceKey = communityQueryKeys.channels(
    'other-member',
    'other-workspace',
    'available',
  );
  const otherUserKey = communityQueryKeys.channels('owner', 'workspace', 'available');
  queryClient.setQueryData(key, []);
  queryClient.setQueryData(categoryKey, []);
  queryClient.setQueryData(otherWorkspaceKey, []);
  queryClient.setQueryData(otherUserKey, []);
  const observer = new QueryObserver(queryClient, {
    queryKey: key,
    queryFn: async () => [{ id: 'new-channel', isMember: false }],
    staleTime: Infinity,
  });
  const categories = new QueryObserver(queryClient, {
    queryKey: categoryKey,
    queryFn: async () => [{ id: 'new-category' }],
    staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => {});
  const unsubscribeCategories = categories.subscribe(() => {});
  try {
    await refreshChannelInventory(queryClient, 'other-member', 'workspace');
    assert.deepEqual(queryClient.getQueryData(key), [{ id: 'new-channel', isMember: false }]);
    assert.deepEqual(queryClient.getQueryData(categoryKey), [{ id: 'new-category' }]);
    assert.equal(queryClient.getQueryState(otherWorkspaceKey)?.isInvalidated, false);
    assert.equal(queryClient.getQueryState(otherUserKey)?.isInvalidated, false);
  } finally {
    unsubscribe();
    unsubscribeCategories();
    queryClient.clear();
  }
});

test('an initial request from before creation cannot overwrite the new channel list', async () => {
  const queryClient = fixture();
  const key = communityQueryKeys.channels('user', 'workspace', 'available');
  let finishOld!: (value: unknown[]) => void;
  let requests = 0;
  const observer = new QueryObserver(queryClient, {
    queryKey: key,
    queryFn: () => {
      requests++;
      if (requests === 1)
        return new Promise<unknown[]>((resolve) => {
          finishOld = resolve;
        });
      return Promise.resolve([{ id: 'new-channel' }]);
    },
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await refreshChannelInventory(queryClient, 'user', 'workspace');
    finishOld([]);
    await Promise.resolve();
    assert.equal(requests, 2);
    assert.deepEqual(queryClient.getQueryData(key), [{ id: 'new-channel' }]);
  } finally {
    unsubscribe();
    queryClient.clear();
  }
});

test('reconnect invalidates available, joined and category caches in every workspace for this identity', async () => {
  const queryClient = fixture();
  const keys = ['workspace-a', 'workspace-b'].flatMap((workspaceId) => [
    communityQueryKeys.channels('user', workspaceId, 'available'),
    communityQueryKeys.channels('user', workspaceId, 'joined'),
    communityQueryKeys.categories('user', workspaceId),
  ]);
  for (const key of keys) queryClient.setQueryData(key, []);
  const otherIdentity = communityQueryKeys.channels('other-user', 'workspace-a', 'available');
  queryClient.setQueryData(otherIdentity, []);
  await refreshChannelInventory(queryClient, 'user');
  for (const key of keys) assert.equal(queryClient.getQueryState(key)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(otherIdentity)?.isInvalidated, false);
  queryClient.clear();
});
