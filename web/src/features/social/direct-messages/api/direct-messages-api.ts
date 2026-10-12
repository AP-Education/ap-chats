import { apiRequest, jsonInit } from '@/shared/api/http';

export interface DirectMessage {
  id: string;
  workspaceId: string;
  participant: {
    memberId: string;
    displayName: string | null;
    avatarPath: string | null;
    active: boolean;
  };
  notification: {
    isMuted: boolean;
    mutedUntil: string | null;
  };
  lastMessage: {
    id: string;
    markdown: string | null;
    authorMemberId: string;
    createdAt: string;
  } | null;
  updatedAt: string;
}

export interface UnreadDirectMessage extends DirectMessage {
  unreadCount: number;
}

export interface PersonResult {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

export function listDirectMessages(
  token: string,
  before?: string,
): Promise<{ items: DirectMessage[]; nextCursor: string | null }> {
  const suffix = before ? `?before=${encodeURIComponent(before)}` : '';
  return apiRequest(`/api/direct-messages${suffix}`, token);
}

export function listUnreadDirectMessages(token: string): Promise<UnreadDirectMessage[]> {
  return apiRequest('/api/direct-messages/unread', token);
}

export function getDirectMessage(token: string, channelId: string): Promise<DirectMessage> {
  return apiRequest(`/api/direct-messages/${channelId}`, token);
}

export function openDirectMessage(
  token: string,
  workspaceId: string,
  memberId: string,
): Promise<DirectMessage> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/direct-messages`,
    token,
    jsonInit('POST', { memberId }),
  );
}

export function updateDirectMessageMute(
  token: string,
  workspaceId: string,
  channelId: string,
  mode: 'unmute' | 'hour' | 'day' | 'indefinite',
): Promise<DirectMessage> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/direct-messages/${channelId}/mute`,
    token,
    jsonInit('PATCH', { mode }),
  );
}

export function searchPeople(
  token: string,
  workspaceId: string,
  query: string,
): Promise<PersonResult[]> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/members/search?q=${encodeURIComponent(query)}`,
    token,
  );
}
