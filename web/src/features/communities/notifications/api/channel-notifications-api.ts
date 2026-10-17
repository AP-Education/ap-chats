import { apiRequest, jsonInit } from '@/shared/api/http';

import type { ChangeNotificationSettings, NotificationSettings } from '../types';

function path(workspaceId: string, channelId: string): string {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/notifications`;
}

export function getChannelNotificationSettings(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<NotificationSettings> {
  return apiRequest(path(workspaceId, channelId), token);
}

export function changeChannelNotificationSettings(
  token: string,
  workspaceId: string,
  channelId: string,
  change: ChangeNotificationSettings,
): Promise<NotificationSettings> {
  return apiRequest(path(workspaceId, channelId), token, jsonInit('PATCH', change));
}
