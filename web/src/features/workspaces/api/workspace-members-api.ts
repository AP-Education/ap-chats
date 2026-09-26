import { apiRequest } from '@/shared/api/http';

import type { WorkspaceMember } from '../types';

export function listWorkspaceMembers(
  token: string,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  return apiRequest(`/api/workspaces/${workspaceId}/members`, token);
}
