import type { Room } from 'livekit-client';

import { playJoinChime, playLeaveChime } from './call-chimes';
import { startRingback } from './call-tones';
import { watchRoomPresence } from './room-presence';

/** The sounds that follow who is in the room once this device has connected:
 * alone means you placed the call, so it rings back until someone answers;
 * everyone joining gets the join chime, and in a group call everyone leaving
 * the leave chime. Mirrors web/'s useOutgoingRingback plus CallPresenceCues. */
export function trackCallCues(room: Room, group: boolean): () => void {
  let stopRingback = room.remoteParticipants.size === 0 ? startRingback() : undefined;

  const stopWatching = watchRoomPresence(room, {
    joined() {
      stopRingback?.();
      stopRingback = undefined;
      playJoinChime();
    },
    // In a DM the other side leaving ends the call, and end-call.ts plays that ending.
    left() {
      if (group) playLeaveChime();
    },
  });

  return () => {
    stopRingback?.();
    stopWatching();
  };
}
