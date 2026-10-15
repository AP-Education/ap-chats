import { apiRequest } from '@/shared/api/http';

import type { ChannelMembership } from '../types';

function membersUrl(workspaceId: string, channelId: string): string {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/members`;
}

export function listChannelMembers(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<ChannelMembership[]> {
  return apiRequest(membersUrl(workspaceId, channelId), token);
}
