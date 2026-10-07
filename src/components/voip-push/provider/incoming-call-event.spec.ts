import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CallSignalPayload } from '@/components/calls/events/call-signal.event';

import { buildIncomingCallEvent } from './incoming-call-event';

const PAYLOAD: CallSignalPayload = {
  workspaceId: 'ws-1',
  channelId: 'chan-1',
  channelKind: 'dm',
  callId: '4eb7c430-c67c-463c-bd66-64e9f5c16e7d',
  roomName: 'room-1',
  startedByMemberId: 'member-1',
  startedByDisplayName: 'Alice',
  startedByAvatarPath: '/avatars/alice.png',
};

test('maps CallSignalPayload onto expo-callkit-telecom incomingCall wire shape', () => {
  const event = buildIncomingCallEvent(PAYLOAD);

  assert.equal(event.serverCallId, PAYLOAD.callId);
  assert.equal(event.hasVideo, false);
  assert.equal(event.caller.id, 'member-1');
  assert.equal(event.caller.displayName, 'Alice');
  assert.match(event.eventId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(event.metadata, {
    workspaceId: 'ws-1',
    channelId: 'chan-1',
    channelKind: 'dm',
    roomName: 'room-1',
  });
});

test('omits displayName rather than sending null — the wire type wants a string or absent', () => {
  const event = buildIncomingCallEvent({ ...PAYLOAD, startedByDisplayName: null });

  assert.equal('displayName' in event.caller, false);
});

test('retries of the same call retain the native deduplication identifier', () => {
  const first = buildIncomingCallEvent(PAYLOAD);
  const second = buildIncomingCallEvent(PAYLOAD);

  assert.equal(first.eventId, second.eventId);
});
