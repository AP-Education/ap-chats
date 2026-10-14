import type { Room } from 'livekit-client';

import { activeCall } from '../api/calls-api';
import { outgoingRing, ringDeadline } from './outgoing-ring';
import { requireAccessToken } from './require-access-token';
import { watchRoomPresence } from './room-presence';
import type { TrackedSessionMetadata } from './session-registry';

// By then the server has let an unanswered ring go; one look settles a call it never told us about.
const SETTLE_AFTER_DEADLINE_MS = 2000;

interface CallToFollow {
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

/** A call this device placed, from its ring until someone answers it or it ends. */
export interface PlacedCall {
  /** The server says someone answered; without its time, the server is asked for it. */
  answer: (answeredAt: number | undefined) => void;
  /** Asks the server where the call stands, as once the socket is back. */
  resync: () => void;
  /** Someone in the room may be the answer arriving before the server's word does. */
  watch: (room: Room) => void;
  stop: () => void;
}

/**
 * Follows a placed call by what the server says of it: its signals while the socket is up, an ask
 * when they may have been missed. The ringback itself is CallKit/Telecom's dialtone, which stops
 * the moment `answered` reports the call connected; each outcome comes exactly once.
 */
export function placeCall(call: CallToFollow, outcomes: PlacedCallOutcomes): PlacedCall {
  let settled = false;
  let stopWatching: (() => void) | undefined;

  function settle(outcome: () => void) {
    if (settled) return;
    settled = true;
    clearTimeout(deadline);
    stopWatching?.();
    outcome();
  }

  // A failed ask leaves the call ringing, unless something already showed it was answered.
  async function ask(answeredMeanwhile?: number) {
    const { workspaceId, channelId } = call.metadata;
    const live = await requireAccessToken()
      .then((token) => activeCall(token, workspaceId, channelId))
      .catch(() => undefined);
    if (settled) return;

    if (live === undefined) {
      if (answeredMeanwhile !== undefined) settle(() => outcomes.answered(answeredMeanwhile));
      return;
    }
    const state = outgoingRing(call.callId, live);
    if (state === 'over') settle(outcomes.over);
    if (state === 'answered') {
      const answeredAt = live?.answeredAt ? Date.parse(live.answeredAt) : Date.now();
      settle(() => outcomes.answered(answeredAt));
    }
  }

  const deadline = setTimeout(
    () => void ask(),
    ringDeadline(call.startedAt) + SETTLE_AFTER_DEADLINE_MS - Date.now(),
  );

  return {
    answer(answeredAt) {
      if (answeredAt === undefined) void ask(Date.now());
      else settle(() => outcomes.answered(answeredAt));
    },
    resync: () => void ask(),
    watch(room) {
      if (settled) return;
      // The caller's own other device joining answers nothing, so the server decides.
      stopWatching = watchRoomPresence(room, {
        joined: () => void ask(Date.now()),
        left: () => undefined,
      });
    },
    stop: () => settle(() => undefined),
  };
}
