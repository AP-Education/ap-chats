import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  combinedAttention,
  conversationAttention,
  QUIET,
  workspaceAttention,
} from './conversation-attention.ts';
import type { ChannelUnread } from './hooks/useWorkspaceUnread.ts';

function conversation(changes: Partial<ChannelUnread> = {}): ChannelUnread {
  return {
    channelId: 'general',
    kind: 'channel',
    lastReadEntrySeq: '0',
    unreadCount: 12,
    mentionCount: 2,
    ...changes,
  };
}

test('a channel marks what is new and counts only what mentions the person', () => {
  const heard = { unread: true, badge: 2, muted: false };

  assert.deepEqual(conversationAttention(conversation(), 'mentions'), heard);
  assert.deepEqual(conversationAttention(conversation(), 'all'), heard);
  assert.deepEqual(conversationAttention(conversation({ mentionCount: 0 }), 'all'), {
    ...heard,
    badge: 0,
  });
});

test('a direct conversation counts every unread message', () => {
  const direct = conversation({ kind: 'dm', unreadCount: 3, mentionCount: 0 });

  assert.deepEqual(conversationAttention(direct, 'all'), { unread: true, badge: 3, muted: false });
});

test('a muted conversation asks for nothing, mentions included', () => {
  const muted = { ...QUIET, muted: true };

  assert.deepEqual(conversationAttention(conversation(), 'none'), muted);
  assert.deepEqual(conversationAttention(conversation({ kind: 'dm' }), 'none'), muted);
});

test('a workspace sums what its conversations ask and is new while any of them is', () => {
  const notify = new Map([['muted', 'none' as const]]);
  const attention = workspaceAttention(
    [
      conversation({ channelId: 'quiet', unreadCount: 0, mentionCount: 0 }),
      conversation({ channelId: 'busy', unreadCount: 5, mentionCount: 0 }),
      conversation({ channelId: 'muted', unreadCount: 9, mentionCount: 4 }),
      conversation({ channelId: 'mentioned', unreadCount: 1, mentionCount: 1 }),
    ],
    notify,
  );

  assert.deepEqual(combinedAttention(attention.values()), { unread: true, badge: 1, muted: false });
  assert.deepEqual(combinedAttention([QUIET, QUIET]), QUIET);
});

test('a workspace reads as muted only once every channel in it is', () => {
  const muted = { ...QUIET, muted: true };

  assert.equal(combinedAttention([muted, muted]).muted, true);
  assert.equal(combinedAttention([muted, QUIET]).muted, false);
  assert.equal(combinedAttention([]).muted, false);
});

test('a conversation the workspace has not described yet follows the defaults', () => {
  const attention = workspaceAttention([conversation({ kind: 'dm', unreadCount: 2 })], undefined);

  assert.deepEqual(attention.get('general'), { unread: true, badge: 2, muted: false });
});
