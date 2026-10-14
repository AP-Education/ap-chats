import type { Room } from 'livekit-client';

import { playJoinChime, playLeaveChime } from './call-chimes';
import { watchRoomPresence } from './room-presence';

/** The sounds that follow who is in the room once this device has connected:
 * everyone joining gets the join chime, and in a group call everyone leaving
 * the leave chime. Mirrors web/'s CallPresenceCues; the ringback is CallKit's
 * own dialtone, which follows the call's state instead (placed-call.ts). */
export function trackCallCues(room: Room, group: boolean): () => void {
  return watchRoomPresence(room, {
    joined: playJoinChime,
    // In a DM the other side leaving ends the call, and end-call.ts plays that ending.
    left() {
      if (group) playLeaveChime();
    },
  });
}
