import { randomUUID } from 'node:crypto';

import type { CallSignalPayload } from '@/components/calls/events/call-signal.event';

// The exact wire shape expo-callkit-telecom's native code parses out of a VoIP
// push before JS even runs — see its README's "VoIP push payload" section.
// Both APNs and FCM wrap this under an `incomingCall` key, just at different
// layers (APNs: the payload dict; FCM: JSON-encoded inside a data field).
export interface IncomingCallEventWire {
  eventId: string;
  serverCallId: string;
  hasVideo: boolean;
  caller: {
    id: string;
    displayName?: string;
  };
  metadata: {
    workspaceId: string;
    channelId: string;
    channelKind: string;
    roomName: string;
  };
}

export function buildIncomingCallEvent(payload: CallSignalPayload): IncomingCallEventWire {
  return {
    eventId: randomUUID(),
    serverCallId: payload.callId,
    hasVideo: false,
    caller: {
      id: payload.startedByMemberId,
      ...(payload.startedByDisplayName ? { displayName: payload.startedByDisplayName } : {}),
    },
    metadata: {
      workspaceId: payload.workspaceId,
      channelId: payload.channelId,
      channelKind: payload.channelKind,
      roomName: payload.roomName,
    },
  };
}
