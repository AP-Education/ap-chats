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
