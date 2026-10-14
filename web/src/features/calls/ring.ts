import type { CallView } from './api/calls-api';

// The API's RING_TTL_SECONDS: by then a ring nobody answered is missed.
const RING_MS = 45_000;

/** Whether the server still has this call ringing. */
export function isStillRinging(callId: string, live: CallView | null | undefined): boolean {
  return live?.id === callId && live.status === 'ringing';
}

/** How long the call may still ring, by its own start rather than by when this device saw it. */
export function remainingRingMs(startedAt: string, now = Date.now()): number {
  return Math.max(0, Date.parse(startedAt) + RING_MS - now);
}
