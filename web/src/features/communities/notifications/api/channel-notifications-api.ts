import { apiRequest, jsonInit } from '@/shared/api/http';

import type { ChangeNotificationSettings, ChannelNotificationSettings } from '../types';

function path(workspaceId: string, channelId: string): string {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/notifications`;
}

export function getChannelNotificationSettings(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<ChannelNotificationSettings> {
  return apiRequest(path(workspaceId, channelId), token);
}

export function changeChannelNotificationSettings(
  token: string,
  workspaceId: string,
  channelId: string,
  change: ChangeNotificationSettings,
): Promise<ChannelNotificationSettings> {
  return apiRequest(path(workspaceId, channelId), token, jsonInit('PATCH', change));
}
