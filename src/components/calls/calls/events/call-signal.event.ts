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
