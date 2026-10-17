import { apiRequest, jsonInit } from '@/shared/api/http';

import type { ChangeNotificationSettings, WorkspaceNotifications } from '../types';

function path(workspaceId: string): string {
  return `/api/workspaces/${workspaceId}/notifications`;
}

export function getWorkspaceNotifications(
  token: string,
  workspaceId: string,
): Promise<WorkspaceNotifications> {
  return apiRequest(path(workspaceId), token);
}

export function changeWorkspaceNotifications(
  token: string,
  workspaceId: string,
  change: ChangeNotificationSettings,
): Promise<WorkspaceNotifications> {
  return apiRequest(path(workspaceId), token, jsonInit('PATCH', change));
}
