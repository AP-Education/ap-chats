import type { CallRecord } from '../calls/types';

export interface CallHistoryParticipant {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  active: boolean;
}

// "missed" is only what rang for you and went unanswered, never your own unanswered dial.
export type CallHistoryFilter = 'all' | 'missed';

export type CallHistoryEntry = CallRecord & { participant: CallHistoryParticipant };
