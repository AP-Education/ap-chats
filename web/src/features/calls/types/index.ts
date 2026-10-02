import type { CallJoinGrant } from '../api/calls-api';
import type { CallSignal } from '../schemas';

/** Sent to the native mobile shell over the WebView bridge so it can connect the
 * LiveKit room itself — the WebView can't reliably capture the microphone
 * (insecure http:// context, no WebView media-permission grant configured). */
export interface NativeCallConnectPayload {
  workspaceId: string;
  channelId: string;
  title: string;
  calleeAvatarPath?: string | null;
  grant: CallJoinGrant;
}

export interface CallAction {
  onClick: () => void;
  pending: boolean;
  inCall: boolean;
  busy: boolean;
  joinable: boolean;
  minimized: boolean;
}

// Mirrors src/components/calls/calls.service.ts `notify()`. Calls owns this map
// itself, not realtime: these are call-domain payloads, and realtime only needs
// to expose the generic useSocketEvent primitive, not know this map exists.
export type CallServerToClientEvents = {
  'call:incoming': (payload: CallSignal) => void;
  'call:accepted': (payload: CallSignal) => void;
  'call:declined': (payload: CallSignal) => void;
  'call:ended': (payload: CallSignal) => void;
  'call:missed': (payload: CallSignal) => void;
};
