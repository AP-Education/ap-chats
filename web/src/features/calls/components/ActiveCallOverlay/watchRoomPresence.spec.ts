import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';

import { ConnectionState, type Room, RoomEvent } from 'livekit-client';

import { watchRoomPresence } from './watchRoomPresence';

class FakeRoom extends EventEmitter {
  state = ConnectionState.Connecting;
  remoteParticipants = new Map<string, { identity: string }>();

  connect(...identities: string[]) {
    for (const identity of identities) this.remoteParticipants.set(identity, { identity });
    this.state = ConnectionState.Connected;
    this.emit(RoomEvent.Connected);
  }

  join(identity: string) {
    const participant = { identity };
    this.remoteParticipants.set(identity, participant);
    this.emit(RoomEvent.ParticipantConnected, participant);
  }

  leave(identity: string) {
    const participant = this.remoteParticipants.get(identity);
    this.remoteParticipants.delete(identity);
    this.emit(RoomEvent.ParticipantDisconnected, participant);
  }

  // Mirrors livekit-client's handleRestarting: everyone is dropped before the state flips.
  restart() {
    for (const identity of [...this.remoteParticipants.keys()]) this.leave(identity);
    this.state = ConnectionState.Reconnecting;
    this.emit(RoomEvent.Reconnecting);
  }

  restarted(...identities: string[]) {
    for (const identity of identities) this.remoteParticipants.set(identity, { identity });
    this.state = ConnectionState.Connected;
    this.emit(RoomEvent.Reconnected);
    for (const identity of identities) this.emit(RoomEvent.ParticipantConnected, { identity });
  }
}

function watch(room: FakeRoom) {
  const cues: string[] = [];
  const stop = watchRoomPresence(room as unknown as Room, {
    joined: () => cues.push('joined'),
    left: () => cues.push('left'),
  });
  return { cues, stop };
}

const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

test('connecting to people already in the room greets them, connecting alone does not', () => {
  const crowded = new FakeRoom();
  const empty = new FakeRoom();
  const crowdedCues = watch(crowded).cues;
  const emptyCues = watch(empty).cues;

  crowded.connect('caller');
  empty.connect();

  assert.deepEqual(crowdedCues, ['joined']);
  assert.deepEqual(emptyCues, []);
});

test('someone joining and leaving is announced each time', async () => {
  const room = new FakeRoom();
  const { cues } = watch(room);
  room.connect();

  room.join('callee');
  room.leave('callee');
  await settle();

  assert.deepEqual(cues, ['joined', 'left']);
});

test('a full reconnect re-adding the same people stays silent', async () => {
  const room = new FakeRoom();
  const { cues } = watch(room);
  room.connect('a', 'b');

  room.restart();
  await settle();
  room.restarted('a', 'b');

  assert.deepEqual(cues, ['joined']);
});

test('stopping detaches every listener', () => {
  const room = new FakeRoom();
  const { cues, stop } = watch(room);

  stop();
  room.connect('caller');
  room.join('late');

  assert.deepEqual(cues, []);
  assert.equal(room.eventNames().length, 0);
});
