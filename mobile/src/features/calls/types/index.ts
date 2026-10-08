/** Mirrors the `metadata` this app puts on the VoIP push's `incomingCall` event
 * (see `CallSignalPayload` in the backend's `voip-push` module) — the only fields
 * `useJoinCall`'s native counterpart needs to call `/calls/:id/token`. */
export interface CallSignalMetadata {
  workspaceId: string;
  channelId: string;
  channelKind: string;
  roomName: string;
}

export interface CallJoinGrant {
  callId: string;
  roomName: string;
  startedAt: string;
  url: string;
  token: string;
  expiresAt: string;
}

/** Sent by web/'s useStartCall/useJoinCall over the WebView bridge: the WebView
 * can't reliably capture the microphone (insecure http:// context, no WebView
 * media-permission grant configured), so the native shell connects the LiveKit
 * room and owns the in-call screen instead, the same as an answered incoming call. */
export interface NativeCallConnectPayload {
  workspaceId: string;
  channelId: string;
  title: string;
  calleeAvatarPath?: string | null;
  grant: CallJoinGrant;
}

export type AudioOutputKind = 'speaker' | 'earpiece' | 'wired' | 'bluetooth';

export interface AudioOutput {
  kind: AudioOutputKind;
  name: string;
}

export interface CallAudioRoute {
  current?: AudioOutput;
  /** Where a "not speaker" choice lands; undefined until the OS has reported one. */
  private?: AudioOutput;
}
