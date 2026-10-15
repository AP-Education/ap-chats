import type { LiveCall } from '../api/calls-api';

// The API's RING_TTL_SECONDS: by then a ring nobody answered is missed.
const RING_MS = 45_000;

export type OutgoingRing = 'ringing' | 'answered' | 'over';

/** Where a call this device placed stands, by the channel's live call on the server. */
export function outgoingRing(callId: string, live: LiveCall | null): OutgoingRing {
  if (!live || live.id !== callId) return 'over';
  return live.status === 'ringing' ? 'ringing' : 'answered';
}

/** When the call's ring runs out, by its own start rather than by when this device joined it. */
export function ringDeadline(startedAt: string): number {
  return Date.parse(startedAt) + RING_MS;
}
