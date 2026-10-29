import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type InfiniteData, QueryClient } from '@tanstack/react-query';

import { catchUpHistory, mergeHistoryItem, shareHistory } from './history-cache.ts';
import type { PageCursor } from './hooks/useMessageHistory.ts';
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
    author: {
      memberId: 'member',
      displayName: 'Member',
      avatarPath: null,
      isBot: false,
      roleColor: null,
    },
    reply: null,
    context: null,
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
    peerReadSeq: null,
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

function history(pages: HistoryPage[]): InfiniteData<HistoryPage, PageCursor> {
  return { pages, pageParams: pages.map(() => ({ mode: 'window' }) as PageCursor) };
}

test('older history arriving in front keeps the objects of everything already shown', () => {
  const shown = history([page([item('c', '3'), item('d', '4')])]);
  const fetched = structuredClone(shown);
  const older = history([page([item('a', '1'), item('b', '2')]), ...fetched.pages]);

  const shared = shareHistory(shown, older) as typeof older;

  assert.equal(shared.pages[1], shown.pages[0]);
  assert.equal(shared.pages[1]!.items[0], shown.pages[0]!.items[0]);
});

test('an edited entry is new while its neighbours keep their objects', () => {
  const shown = history([page([item('a', '1'), item('b', '2')])]);
  const editedEntry = item('b', '2');
  editedEntry.message.markdown = 'edited';
  const edited = history([page([item('a', '1'), editedEntry])]);

  const shared = shareHistory(shown, edited) as typeof edited;

  assert.equal(shared.pages[0]!.items[0], shown.pages[0]!.items[0]);
  assert.notEqual(shared.pages[0]!.items[1], shown.pages[0]!.items[1]);
  assert.deepEqual(shared.pages[0]!.items[1], editedEntry);
});

test('a page whose read state moved keeps its entries list', () => {
  const shown = history([page([item('a', '1'), item('b', '2')])]);
  const read = structuredClone(shown);
  read.pages[0]!.readState = { lastReadEntrySeq: '2', unreadCount: 0, mentionCount: 0 };

  const shared = shareHistory(shown, read) as typeof read;

  assert.notEqual(shared.pages[0], shown.pages[0]);
  assert.equal(shared.pages[0]!.items, shown.pages[0]!.items);
});

test('the same history fetched again is the history already held', () => {
  const shown = history([page([item('a', '1')]), page([item('b', '2')])]);

  assert.equal(shareHistory(shown, structuredClone(shown)), shown);
});
