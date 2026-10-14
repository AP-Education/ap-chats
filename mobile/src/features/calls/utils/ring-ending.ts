import type { CallEndedReason } from 'expo-callkit-telecom';

// The API's word for why a ring stopped, as the OS records it in the call log.
const REASONS: Record<string, CallEndedReason> = {
  answered: 'answeredElsewhere',
  declined: 'declinedElsewhere',
  cancelled: 'remoteEnded',
  missed: 'unanswered',
};

export interface RingEnding {
  callId: string;
  reason: CallEndedReason;
}

/** The `ringEnded` push the API sends once a ring stops, as a background notification task gets it. */
export function readRingEnding(payload: unknown): RingEnding | null {
  const fields = (payload as { data?: Record<string, unknown> } | null)?.data;
  if (fields?.messageType !== 'ringEnded' || typeof fields.callId !== 'string') return null;

  const reason = REASONS[String(fields.reason)];
  return reason ? { callId: fields.callId, reason } : null;
}
