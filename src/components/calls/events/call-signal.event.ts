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

// Mirrors call-entry-created.event.ts — CallsService publishes this ignorant of who
// listens; CallsGateway (sockets) and CallPushNotifier (VoIP/FCM) each decide on
// their own which kinds they care about.
export class CallSignalEvent {
  constructor(
    public readonly kind: CallSignalKind,
    public readonly payload: CallSignalPayload,
    public readonly recipientUserIds: readonly string[],
  ) {}
}
