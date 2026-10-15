import { apiRequest, jsonInit } from '@/shared/api/http';

import type { ChannelPermissions, ChannelPermissionsInput } from '../types';

function permissionsUrl(workspaceId: string, channelId: string): string {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/permissions`;
}

export function getChannelPermissions(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<ChannelPermissions> {
  return apiRequest(permissionsUrl(workspaceId, channelId), token);
}

export function changeChannelPermissions(
  token: string,
  workspaceId: string,
  channelId: string,
  input: ChannelPermissionsInput,
): Promise<ChannelPermissions> {
  return apiRequest(permissionsUrl(workspaceId, channelId), token, jsonInit('PUT', input));
}
