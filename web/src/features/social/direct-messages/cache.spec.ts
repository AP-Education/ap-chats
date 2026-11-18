import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QueryClient } from '@tanstack/react-query';

import type { Message } from '../messaging/types';
import type { DirectMessage } from './api/direct-messages-api';
import { confirmDirectMessage } from './cache.ts';
import { directMessageKey } from './queryKeys.ts';

const identity = 'viewer';
const key = directMessageKey(identity);

function conversation(lastCall: DirectMessage['lastCall']): DirectMessage {
  return {
    id: 'dm',
    workspaceId: 'workspace',
    participant: { memberId: 'bob', displayName: 'Bob', avatarPath: null, active: true },
    notification: { isMuted: false, mutedUntil: null },
    lastMessage: null,
    lastCall,
    updatedAt: '2026-11-18T10:00:00Z',
  };
}

function sent(createdAt: string): Message {
  return { id: 'message', authorMemberId: 'viewer', markdown: 'Hi', createdAt } as Message;
}

const call = {
  id: 'call',
  status: 'ended' as const,
  startedByMemberId: 'bob',
  startedAt: '2026-11-18T10:05:00Z',
};

function cached(detail: DirectMessage, row: DirectMessage) {
  const queryClient = new QueryClient();
  queryClient.setQueryData([...key, 'dm'], detail);
  queryClient.setQueryData(key, { pages: [{ items: [row], nextCursor: null }], pageParams: [] });
  return queryClient;
}

const listed = (queryClient: QueryClient) =>
  queryClient.getQueryData<{ pages: { items: DirectMessage[] }[] }>(key)!.pages[0]!.items[0]!;

test('a delayed confirmation keeps a newer call the list holds though the detail lacks it', () => {
  const queryClient = cached(conversation(null), conversation(call));

  confirmDirectMessage(queryClient, identity, 'dm', sent('2026-11-18T10:01:00Z'));

  assert.deepEqual(listed(queryClient).lastCall, call);
  assert.deepEqual(queryClient.getQueryData<DirectMessage>([...key, 'dm'])!.lastCall, call);
});

test('a message sent after the call takes the preview from it', () => {
  const queryClient = cached(conversation(null), conversation(call));

  confirmDirectMessage(queryClient, identity, 'dm', sent('2026-11-18T10:09:00Z'));

  assert.equal(listed(queryClient).lastCall, null);
  assert.equal(listed(queryClient).lastMessage?.id, 'message');
});
