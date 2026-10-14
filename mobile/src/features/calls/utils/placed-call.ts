import type { Room } from 'livekit-client';

import { activeCall } from '../api/calls-api';
import { startRingback } from './call-tones';
import { outgoingRing, ringDeadline } from './outgoing-ring';
import { requireAccessToken } from './require-access-token';
import { watchRoomPresence } from './room-presence';
import type { TrackedSessionMetadata } from './session-registry';

const CHECK_MS = 3000;

interface PlacedCall {
  metadata: TrackedSessionMetadata;
  callId: string;
  startedAt: string;
}

interface PlacedCallOutcomes {
  /** Someone answered, at the server's own time: the call lasts from then. */
  answered: (answeredAt: number) => void;
  /** Declined, hung up or missed: the server no longer has the call. */
  over: () => void;
}

/**
 * Follows a call this device placed until someone answers it or it ends, asking the server every
 * few seconds; each ask also lets the server notice a ring nobody answered. Meanwhile it rings
 * back: never for merely being alone in the room, never once someone joins it, and never past the
 * ring's deadline.
 */
export function followPlacedCall(
  call: PlacedCall,
  room: Room,
  outcomes: PlacedCallOutcomes,
): () => void {
  let stopTone: (() => void) | undefined;
  let mayRing = true;
  let finished = false;

  function silence() {
    mayRing = false;
    stopTone?.();
    stopTone = undefined;
  }

  function finish() {
    finished = true;
    clearInterval(checks);
    clearTimeout(deadline);
    silence();
  }

  async function check() {
    const { workspaceId, channelId } = call.metadata;
    const live = await requireAccessToken()
      .then((token) => activeCall(token, workspaceId, channelId))
      .catch(() => undefined);
    if (finished || live === undefined) return;

    const state = outgoingRing(call.callId, live);
    if (state === 'ringing') {
      if (mayRing) stopTone ??= startRingback();
      return;
    }
    finish();
    if (state === 'answered' && live?.answeredAt) outcomes.answered(Date.parse(live.answeredAt));
    if (state === 'over') outcomes.over();
  }

  const checks = setInterval(() => void check(), CHECK_MS);
  // Past it the ring is missed, whether or not a check gets through to hear the server say so.
  const deadline = setTimeout(silence, ringDeadline(call.startedAt) - Date.now());
  // Whoever joins has answered: the ringback stops at once, and the server tells when.
  const stopWatching = watchRoomPresence(room, {
    joined: () => {
      silence();
      void check();
    },
    left: () => undefined,
  });
  void check();

  return () => {
    finish();
    stopWatching();
  };
}
