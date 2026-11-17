import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';

import { type Room, RoomEvent } from 'livekit-client';

import { type RemoteParticipantUpdate, trackRemoteParticipant } from './track-remote-participant';

class FakeRoom extends EventEmitter {
  isRecording = false;
  remoteParticipants = new Map();
}

test('reports when the call service starts and stops recording the room', (t) => {
  const room = new FakeRoom();
  const updates: RemoteParticipantUpdate[] = [];
  const stop = trackRemoteParticipant(room as unknown as Room, (update) => updates.push(update));
  t.after(stop);

  assert.equal(updates.at(-1)?.recording, false);
  room.isRecording = true;
  room.emit(RoomEvent.RecordingStatusChanged, true);
  assert.equal(updates.at(-1)?.recording, true);
  room.isRecording = false;
  room.emit(RoomEvent.RecordingStatusChanged, false);
  assert.equal(updates.at(-1)?.recording, false);
});
