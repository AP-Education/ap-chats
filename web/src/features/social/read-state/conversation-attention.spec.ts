import assert from 'node:assert/strict';
import { test } from 'node:test';

import { combinedAttention, conversationAttention, QUIET } from './conversation-attention.ts';
import type { ChannelUnread } from './hooks/useWorkspaceUnread.ts';
import { createWorkspaceUnreadStore } from './workspace-unread-context.ts';

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
  assert.deepEqual(conversationAttention(conversation(), false), {
    unread: true,
    badge: 2,
    muted: false,
  });
  assert.deepEqual(conversationAttention(conversation({ mentionCount: 0 }), false), {
    unread: true,
    badge: 0,
    muted: false,
  });
});

test('a direct conversation counts every unread message', () => {
  const direct = conversation({ kind: 'dm', unreadCount: 3, mentionCount: 0 });

  assert.deepEqual(conversationAttention(direct, false), { unread: true, badge: 3, muted: false });
});

test('a muted conversation asks for nothing, mentions included', () => {
  const muted = { ...QUIET, muted: true };

  assert.deepEqual(conversationAttention(conversation(), true), muted);
  assert.deepEqual(conversationAttention(conversation({ kind: 'dm' }), true), muted);
});

test('a group sums what its conversations ask and is new while any of them is', () => {
  const attentions = [QUIET, { unread: true, badge: 2 }, { unread: false, badge: 1 }];

  assert.deepEqual(combinedAttention(attentions), { unread: true, badge: 3 });
  assert.deepEqual(combinedAttention([]), { unread: false, badge: 0 });
});

test('the store lists the active channels and every direct one, and counts each workspace', () => {
  const store = createWorkspaceUnreadStore(
    'active',
    [
      {
        workspaceId: 'active',
        conversations: [
          conversation({ channelId: 'mentioned', unreadCount: 1, mentionCount: 1 }),
          conversation({ channelId: 'muted', unreadCount: 9, mentionCount: 4 }),
          conversation({ channelId: 'chat', kind: 'dm', unreadCount: 2, mentionCount: 0 }),
        ],
      },
      {
        workspaceId: 'other',
        conversations: [
          conversation({ channelId: 'busy', unreadCount: 5, mentionCount: 0 }),
          conversation({ channelId: 'far-chat', kind: 'dm', unreadCount: 1, mentionCount: 0 }),
        ],
      },
      { workspaceId: 'loading', conversations: undefined },
    ],
    new Set(['muted']),
  );

  assert.deepEqual(
    [...store.attentionByChannel.keys()],
    ['mentioned', 'muted', 'chat', 'far-chat'],
  );
  assert.equal(store.attentionByChannel.get('muted')?.muted, true);
  assert.deepEqual(store.channelsByWorkspace.get('active'), { unread: true, badge: 1 });
  assert.deepEqual(store.channelsByWorkspace.get('other'), { unread: true, badge: 0 });
  assert.deepEqual(store.channelsByWorkspace.get('loading'), { unread: false, badge: 0 });
  assert.deepEqual(store.channels, { unread: true, badge: 1 });
  assert.deepEqual(store.direct, { unread: true, badge: 3 });
});
