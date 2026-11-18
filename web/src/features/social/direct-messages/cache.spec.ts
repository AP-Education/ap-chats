import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QueryClient } from '@tanstack/react-query';

import type { Message } from '../messaging/types';
import type { DirectMessage } from './api/direct-messages-api';
import { confirmDirectMessage } from './cache.ts';
import { directMessageKey } from './queryKeys.ts';

const identity = 'viewer';
const key = directMessageKey(identity);

type LastCall = NonNullable<DirectMessage['lastCall']>;

const at = (minute: number) => `2026-11-18T10:${String(minute).padStart(2, '0')}:00Z`;

function call(minute: number, status: LastCall['status'] = 'ended', id = `call-${minute}`) {
  return { id, status, startedByMemberId: 'bob', startedAt: at(minute) };
}

function otherMessage(minute: number) {
  return {
    id: `message-${minute}`,
    markdown: 'From Bob',
    authorMemberId: 'bob',
    createdAt: at(minute),
  };
}

function conversation(
  lastCall: DirectMessage['lastCall'],
  lastMessage: DirectMessage['lastMessage'] = null,
): DirectMessage {
  return {
    id: 'dm',
    workspaceId: 'workspace',
    participant: { memberId: 'bob', displayName: 'Bob', avatarPath: null, active: true },
    notification: { isMuted: false, mutedUntil: null },
    lastMessage,
    lastCall,
    updatedAt: at(0),
  };
}

function sent(minute: number): Message {
  return { id: 'sent', authorMemberId: 'viewer', markdown: 'Hi', createdAt: at(minute) } as Message;
}

/** Confirms a message over a detail and a list row, and reads back what both caches now hold. */
function confirm(detail: DirectMessage, row: DirectMessage, minute: number) {
  const queryClient = new QueryClient();
  queryClient.setQueryData([...key, 'dm'], detail);
  queryClient.setQueryData(key, { pages: [{ items: [row], nextCursor: null }], pageParams: [] });

  confirmDirectMessage(queryClient, identity, 'dm', sent(minute));

  const listed = queryClient.getQueryData<{ pages: { items: DirectMessage[] }[] }>(key)!.pages[0]!
    .items[0]!;
  assert.deepEqual(queryClient.getQueryData([...key, 'dm']), listed, 'both caches agree');
  return listed;
}

test('a later call stays, whichever cache holds it', () => {
  assert.deepEqual(confirm(conversation(null), conversation(call(5)), 1).lastCall, call(5));
  assert.deepEqual(confirm(conversation(call(5)), conversation(null), 1).lastCall, call(5));
});

test('of two different calls the later one stays, whichever cache holds it', () => {
  assert.deepEqual(confirm(conversation(call(5)), conversation(call(7)), 1).lastCall, call(7));
  assert.deepEqual(confirm(conversation(call(7)), conversation(call(5)), 1).lastCall, call(7));
});

test('of two snapshots of one call the one further along stays', () => {
  const ringing = call(5, 'ringing', 'call');
  const active = call(5, 'active', 'call');

  assert.deepEqual(confirm(conversation(ringing), conversation(active), 1).lastCall, active);
  assert.deepEqual(confirm(conversation(active), conversation(ringing), 1).lastCall, active);
});

test('a later message one cache already holds outranks the confirmed one and an older call', () => {
  const listed = confirm(conversation(call(5)), conversation(null, otherMessage(9)), 1);

  assert.equal(listed.lastCall, null);
  assert.equal(listed.lastMessage?.id, 'message-9');
});

test('a message sent after the call takes the preview from it', () => {
  const listed = confirm(conversation(null), conversation(call(5)), 9);

  assert.equal(listed.lastCall, null);
  assert.equal(listed.lastMessage?.id, 'sent');
});
