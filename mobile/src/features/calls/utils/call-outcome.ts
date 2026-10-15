import type { CallEndedReason } from 'expo-callkit-telecom';

import type { NativeCallStatus } from '../store/native-call-store';

interface LiveCall {
  id: string;
  status: string;
}

/**
 * Why a call this device still shows is already over, judged by the channel's live call on the
 * server; `null` while it still holds. A ring the server no longer has was answered, declined,
 * missed or hung up somewhere else.
 */
export function callOutcome(
  shown: NativeCallStatus,
  callId: string,
  live: LiveCall | null,
): CallEndedReason | null {
  if (!live || live.id !== callId) return 'remoteEnded';
  if (shown === 'ringing' && live.status !== 'ringing') return 'answeredElsewhere';
  return null;
}
