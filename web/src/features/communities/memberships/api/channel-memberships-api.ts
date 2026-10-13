import { apiRequest } from '@/shared/api/http';

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

export function leaveChannel(token: string, workspaceId: string, channelId: string): Promise<void> {
  return apiRequest(membersUrl(workspaceId, channelId, 'me'), token, { method: 'DELETE' });
}
