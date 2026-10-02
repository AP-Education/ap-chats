import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CallSessionAddedEvent } from 'expo-callkit-telecom';

import { extractCallMetadata } from './call-metadata';

function sessionAddedEvent(incomingCallEvent: unknown): CallSessionAddedEvent {
  return {
    meta: { flushed: false, timestamp: new Date().toISOString() },
    session: {
      id: 'session-1',
      options: { hasVideo: false },
      origin: 'incoming',
      remoteParticipants: [],
      incomingCallEvent,
      status: 'ringing',
      isMuted: false,
      isOnHold: false,
    },
  } as unknown as CallSessionAddedEvent;
}

function incomingCallEvent(metadata: unknown) {
  return {
    eventId: 'event-1',
    serverCallId: 'call-1',
    hasVideo: false,
    caller: { id: 'member-1', displayName: 'Alice' },
    metadata,
  };
}

test('reads valid metadata off the incoming call event', () => {
  const metadata = extractCallMetadata(
    sessionAddedEvent(
      incomingCallEvent({
        workspaceId: 'ws-1',
        channelId: 'chan-1',
        channelKind: 'dm',
        roomName: 'room-1',
      }),
    ),
  );

  assert.deepEqual(metadata, {
    workspaceId: 'ws-1',
    channelId: 'chan-1',
    channelKind: 'dm',
    roomName: 'room-1',
  });
});

test('rejects metadata missing a required field rather than passing through a broken shape', () => {
  const metadata = extractCallMetadata(
    sessionAddedEvent(incomingCallEvent({ workspaceId: 'ws-1', channelId: 'chan-1' })),
  );

  assert.equal(metadata, null);
});

test('rejects when there is no incomingCallEvent at all (an outgoing session)', () => {
  assert.equal(extractCallMetadata(sessionAddedEvent(undefined)), null);
});
