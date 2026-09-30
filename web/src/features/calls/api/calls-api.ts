import { apiRequest, jsonInit } from '@/shared/api/http';

export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed';

export interface CallView {
  id: string;
  channelId: string;
  status: CallStatus;
  startedByMemberId: string;
  startedAt: string;
  endedAt: string | null;
}

export interface CallJoinGrant {
  callId: string;
  roomName: string;
  /** When the call itself began, not when this device joined it. */
  startedAt: string;
  url: string;
  token: string;
  expiresAt: string;
}

export interface CallHistoryParticipant {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  active: boolean;
}

export interface CallHistoryItem extends CallView {
  participant: CallHistoryParticipant;
}

function basePath(workspaceId: string, channelId: string): string {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/calls`;
}

export function startCall(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<CallView> {
  return apiRequest(basePath(workspaceId, channelId), token, jsonInit('POST', {}));
}

export function getActiveCall(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<CallView | null> {
  return apiRequest(`${basePath(workspaceId, channelId)}/active`, token);
}

export function joinCall(
  token: string,
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<CallJoinGrant> {
  return apiRequest(
    `${basePath(workspaceId, channelId)}/${callId}/token`,
    token,
    jsonInit('POST', {}),
  );
}

export function declineCall(
  token: string,
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<{ ok: true }> {
  return apiRequest(
    `${basePath(workspaceId, channelId)}/${callId}/decline`,
    token,
    jsonInit('POST', {}),
  );
}

export function listCallHistory(
  token: string,
  workspaceId: string,
  before?: string,
): Promise<{ items: CallHistoryItem[]; nextCursor: string | null }> {
  const suffix = before ? `?before=${encodeURIComponent(before)}` : '';
  return apiRequest(`/api/workspaces/${workspaceId}/calls${suffix}`, token);
}

export function leaveCall(
  token: string,
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<{ ok: true }> {
  return apiRequest(
    `${basePath(workspaceId, channelId)}/${callId}/leave`,
    token,
    jsonInit('POST', {}),
  );
}
