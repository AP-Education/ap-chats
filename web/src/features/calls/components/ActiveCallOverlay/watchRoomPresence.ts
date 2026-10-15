import { ConnectionState, type Participant, type Room, RoomEvent } from 'livekit-client';

export interface PresenceChanges {
  joined: () => void;
  left: () => void;
}

/**
 * Reports people really joining and leaving the room, including finding
 * others already here once you connect. A full reconnect drops and re-adds
 * everyone at once, which is not news and stays silent.
 */
export function watchRoomPresence(room: Room, { joined, left }: PresenceChanges): () => void {
  let present = new Set(room.remoteParticipants.keys());

  function rebaseline() {
    present = new Set(room.remoteParticipants.keys());
  }

  function greet() {
    rebaseline();
    if (present.size > 0) joined();
  }

  function onParticipantConnected(participant: Participant) {
    if (present.has(participant.identity)) return;
    present.add(participant.identity);
    joined();
  }

  // A full reconnect drops everyone right before switching to Reconnecting, so judge once that lands.
  function onParticipantDisconnected(participant: Participant) {
    queueMicrotask(() => {
      if (room.state !== ConnectionState.Connected) return;
      if (!present.delete(participant.identity)) return;
      left();
    });
  }

  if (room.state === ConnectionState.Connected) greet();
  room
    .on(RoomEvent.Connected, greet)
    .on(RoomEvent.Reconnected, rebaseline)
    .on(RoomEvent.ParticipantConnected, onParticipantConnected)
    .on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);

  return () => {
    room
      .off(RoomEvent.Connected, greet)
      .off(RoomEvent.Reconnected, rebaseline)
      .off(RoomEvent.ParticipantConnected, onParticipantConnected)
      .off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
  };
}
