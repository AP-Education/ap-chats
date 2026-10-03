import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type InfiniteData, QueryClient } from '@tanstack/react-query';

import { catchUpHistory, mergeHistoryItem } from './history-cache.ts';
import { messagingQueryKeys } from './queryKeys.ts';
import type { HistoryPage, MessageHistoryItem } from './types';

function item(id: string, seq: string): MessageHistoryItem {
  return {
    type: 'MESSAGE',
    id,
    seq,
    createdAt: '2026-09-27T12:00:00.000Z',
    message: {
      id,
      seq,
      authorMemberId: 'member',
      clientNonce: id,
      markdown: id,
      contentVersion: 1,
      revision: 1,
      replyToMessageId: null,
      quoteText: null,
      isForwarded: false,
      forwardedFromMemberId: null,
      createdAt: '2026-09-27T12:00:00.000Z',
      editedAt: null,
      deletedAt: null,
    },
    author: { memberId: 'member', displayName: 'Member', avatarPath: null },
    reply: null,
    forwardedFrom: null,
    pin: null,
  };
}

function page(items: MessageHistoryItem[], hasNewer = false): HistoryPage {
  return {
    items,
    snapshotSeq: items.at(-1)?.seq ?? '0',
    firstUnreadSeq: null,
    unreadCount: 0,
    hasOlder: false,
    olderCursor: null,
    hasNewer,
    newerCursor: null,
    readState: null,
  };
}

test('ack and socket delivery of the same message keep one row in the current window', () => {
  const client = new QueryClient();
  const key = messagingQueryKeys.history('user', 'workspace', 'channel');
  client.setQueryData(key, {
    pages: [page([item('first', '1')])],
    pageParams: [{ mode: 'window' }],
  });

  mergeHistoryItem(client, 'user', 'workspace', 'channel', item('second', '2'));
  mergeHistoryItem(client, 'user', 'workspace', 'channel', item('second', '2'));

  const data = client.getQueryData<InfiniteData<HistoryPage>>(key);
  assert.deepEqual(
    data?.pages[0]?.items.map((entry) => entry.id),
    ['first', 'second'],
  );
  assert.equal(data?.pages[0]?.snapshotSeq, '2');
  assert.equal(client.getQueryState(key)?.isInvalidated, false);
});

test('a message outside an anchored window does not corrupt that window', () => {
  const client = new QueryClient();
  const key = messagingQueryKeys.history('user', 'workspace', 'channel', 'first');
  const original = { pages: [page([item('first', '1')], true)], pageParams: [{ mode: 'window' }] };
  client.setQueryData(key, original);

  mergeHistoryItem(client, 'user', 'workspace', 'channel', item('newest', '9'));

  assert.equal(client.getQueryData<InfiniteData<HistoryPage>>(key), original);
});

test('a future message waits for the missing sequence instead of opening a gap', () => {
  const client = new QueryClient();
  const key = messagingQueryKeys.history('user', 'workspace', 'channel');
  const original = { pages: [page([item('first', '1')])], pageParams: [{ mode: 'window' }] };
  client.setQueryData(key, original);

  mergeHistoryItem(client, 'user', 'workspace', 'channel', item('fourth', '4'));

  assert.equal(client.getQueryData<InfiniteData<HistoryPage>>(key), original);
});

test('contiguous acknowledgement does not request an after page', async () => {
  const client = new QueryClient();
  const key = messagingQueryKeys.history('user', 'workspace', 'channel');
  client.setQueryData(key, { pages: [page([item('first', '1')])], pageParams: [] });
  let requests = 0;

  await catchUpHistory(client, 'user', 'workspace', 'channel', key, '2', async () => {
    requests += 1;
    return page([]);
  });
  mergeHistoryItem(client, 'user', 'workspace', 'channel', item('second', '2'));

  assert.equal(requests, 0);
  assert.deepEqual(
    client.getQueryData<InfiniteData<HistoryPage>>(key)?.pages[0]?.items.map((entry) => entry.seq),
    ['1', '2'],
  );
});

test('a sequence gap fetches only missing entries before the acknowledgement', async () => {
  const client = new QueryClient();
  const key = messagingQueryKeys.history('user', 'workspace', 'channel');
  client.setQueryData(key, { pages: [page([item('first', '1')])], pageParams: [] });
  const cursors: string[] = [];

  await catchUpHistory(client, 'user', 'workspace', 'channel', key, '4', async (cursor) => {
    cursors.push(cursor);
    return page([item('second', '2'), item('third', '3')]);
  });
  mergeHistoryItem(client, 'user', 'workspace', 'channel', item('fourth', '4'));

  assert.deepEqual(cursors, ['1']);
  assert.deepEqual(
    client.getQueryData<InfiniteData<HistoryPage>>(key)?.pages[0]?.items.map((entry) => entry.seq),
    ['1', '2', '3', '4'],
  );
});
