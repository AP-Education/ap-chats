import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QueryClient } from '@tanstack/react-query';

import type { UnreadMutation } from '../src/features/realtime/types';
import { applyReadState } from '../src/features/social/read-state/applyReadState';
import {
  applyUnreadMutation,
  mayRemoveUnreadMention,
} from '../src/features/social/read-state/applyUnreadMutation';
import type { ChannelUnread } from '../src/features/social/read-state/hooks/useWorkspaceUnread';
import { workspaceUnreadKey } from '../src/features/social/read-state/queryKeys';

const summary: ChannelUnread[] = [
  { channelId: 'channel', kind: 'channel', lastReadEntrySeq: '9', unreadCount: 2, mentionCount: 1 },
  { channelId: 'dm', kind: 'dm', lastReadEntrySeq: '0', unreadCount: 1, mentionCount: 0 },
];

function mutation(changes: Partial<UnreadMutation> = {}): UnreadMutation {
  return {
    workspaceId: 'workspace',
    channelId: 'channel',
    kind: 'channel',
    eventId: 'event',
    operation: 'append',
    subject: 'message',
    entries: [{ seq: '10', authorMemberId: 'other', mentioned: false }],
    alert: false,
    ...changes,
  };
}

test('updates only the affected channel for entries after the cursor by other members', () => {
  assert.deepEqual(applyUnreadMutation(summary, mutation(), 'self'), [
    { ...summary[0], unreadCount: 3 },
    summary[1],
  ]);
  assert.deepEqual(
    applyUnreadMutation(
      summary,
      mutation({
        entries: [
          { seq: '10', authorMemberId: 'self', mentioned: false },
          { seq: '9', authorMemberId: 'other', mentioned: false },
        ],
      }),
      'self',
    ),
    summary,
  );
});

test('only the new entries that mention the reader count as mentions', () => {
  const entries = [
    { seq: '10', authorMemberId: 'other', mentioned: true },
    { seq: '11', authorMemberId: 'other', mentioned: false },
    { seq: '12', authorMemberId: 'self', mentioned: true },
  ];

  assert.deepEqual(applyUnreadMutation(summary, mutation({ entries }), 'self')[0], {
    ...summary[0],
    unreadCount: 4,
    mentionCount: 2,
  });
});

test('only a removed unread message where mentions are counted needs a recount', () => {
  const removal = mutation({ operation: 'remove' });

  assert.equal(mayRemoveUnreadMention(summary, removal, 'self'), true);
  assert.equal(mayRemoveUnreadMention(summary, mutation(), 'self'), false);
  assert.equal(
    mayRemoveUnreadMention([{ ...summary[0]!, mentionCount: 0 }], removal, 'self'),
    false,
  );
});

test('removes deleted unread entries without going below zero', () => {
  assert.equal(
    applyUnreadMutation(
      summary,
      mutation({
        operation: 'remove',
        entries: [
          { seq: '10', authorMemberId: 'other', mentioned: false },
          { seq: '11', authorMemberId: 'other', mentioned: false },
          { seq: '12', authorMemberId: 'other', mentioned: false },
        ],
      }),
      'self',
    )[0]?.unreadCount,
    0,
  );
});

test('retains the 99+ display cap when exact count is unknown', () => {
  const capped = [{ ...summary[0]!, unreadCount: 100 }];
  assert.equal(applyUnreadMutation(capped, mutation(), 'self')[0]?.unreadCount, 100);
  assert.equal(
    applyUnreadMutation(capped, mutation({ operation: 'remove' }), 'self')[0]?.unreadCount,
    100,
  );
});

test('the active conversation clears an incoming delta without moving its cursor backwards', () => {
  const queryClient = new QueryClient();
  const key = workspaceUnreadKey('user', 'workspace');
  queryClient.setQueryData(key, summary);
  queryClient.setQueryData(key, applyUnreadMutation(summary, mutation(), 'self'));
  applyReadState(queryClient, 'user', 'workspace', 'channel', {
    lastReadEntrySeq: '10',
    unreadCount: 0,
    mentionCount: 0,
  });
  assert.deepEqual(queryClient.getQueryData<ChannelUnread[]>(key)?.[0], {
    ...summary[0],
    lastReadEntrySeq: '10',
    unreadCount: 0,
    mentionCount: 0,
  });
  applyReadState(queryClient, 'user', 'workspace', 'channel', {
    lastReadEntrySeq: '9',
    unreadCount: 3,
    mentionCount: 1,
  });
  assert.equal(queryClient.getQueryData<ChannelUnread[]>(key)?.[0]?.unreadCount, 0);
});
