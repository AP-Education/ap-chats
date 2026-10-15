import type { CallView } from './api/calls-api';
import type { CallSignal } from './schemas';

/**
 * The channel's live call as a signal about it leaves it. The signal carries the call's own state,
 * so a ringback or a timer follows an answer the moment it is heard, not once a refetch lands.
 */
export function liveCallAfter(
  signal: CallSignal,
  live: CallView | null | undefined,
): CallView | null | undefined {
  if (live?.id !== signal.callId) return live;

  const isLive = signal.status === 'ringing' || signal.status === 'active';
  return isLive ? { ...live, status: signal.status, answeredAt: signal.answeredAt } : null;
}
