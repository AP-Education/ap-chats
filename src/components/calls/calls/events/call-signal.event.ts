import type { CallStatus } from '../types';

export const CALL_SIGNAL_EVENT = 'calls.signal';

export type CallSignalKind =
  'call:incoming' | 'call:accepted' | 'call:declined' | 'call:ended' | 'call:missed';

export interface CallSignalPayload {
  workspaceId: string;
  channelId: string;
  channelKind: string;
  callId: string;
  roomName: string;
  startedByMemberId: string;
  startedByDisplayName: string | null;
  startedByAvatarPath: string | null;
  /** Where the call stands as of this signal, so a client follows it without asking again. */
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
}

// Published ignorant of who listens: CallEventsRelay delivers every kind to sockets, and
// CallPushWorker takes the durable incoming ring for VoIP/FCM.
export class CallSignalEvent {
  constructor(
    public readonly kind: CallSignalKind,
    public readonly payload: CallSignalPayload,
    public readonly recipientUserIds: readonly string[],
  ) {}
}
