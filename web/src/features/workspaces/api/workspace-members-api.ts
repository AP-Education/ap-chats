import { apiRequest, jsonInit } from '@/shared/api/http';

import type { WorkspaceAccessLevel, WorkspaceMember } from '../types';

export function listWorkspaceMembers(
  token: string,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  return apiRequest(`/api/workspaces/${workspaceId}/members`, token);
}

export function changeAccessLevel(
  token: string,
  workspaceId: string,
  memberId: string,
  accessLevel: WorkspaceAccessLevel,
): Promise<WorkspaceMember> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/members/${memberId}/access-level`,
    token,
    jsonInit('PATCH', { accessLevel }),
  );
}
