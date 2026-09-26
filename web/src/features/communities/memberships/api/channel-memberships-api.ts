import { apiRequest, jsonInit } from '@/shared/api/http';

import type { ChannelMembership } from '../types';

function membersUrl(workspaceId: string, channelId: string, memberId?: string): string {
  const base = `/api/workspaces/${workspaceId}/channels/${channelId}/members`;
  return memberId ? `${base}/${memberId}` : base;
}

export function listChannelMembers(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<ChannelMembership[]> {
  return apiRequest(membersUrl(workspaceId, channelId), token);
}

export function joinChannel(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<ChannelMembership> {
  return apiRequest(`/api/workspaces/${workspaceId}/channels/${channelId}/join`, token, {
    method: 'POST',
  });
}

export function addChannelMember(
  token: string,
  workspaceId: string,
  channelId: string,
  memberId: string,
): Promise<ChannelMembership> {
  return apiRequest(membersUrl(workspaceId, channelId), token, jsonInit('POST', { memberId }));
}

export function leaveChannel(token: string, workspaceId: string, channelId: string): Promise<void> {
  return apiRequest(membersUrl(workspaceId, channelId, 'me'), token, { method: 'DELETE' });
}

export function removeChannelMember(
  token: string,
  workspaceId: string,
  channelId: string,
  memberId: string,
): Promise<void> {
  return apiRequest(membersUrl(workspaceId, channelId, memberId), token, { method: 'DELETE' });
}
