import type { RoleBadge } from '@/features/roles/types';
import type { WorkspaceAccessLevel } from '@/features/workspaces/types';
import { apiRequest } from '@/shared/api/http';

export interface MemberProfile {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  accessLevel: WorkspaceAccessLevel;
  roles: RoleBadge[];
  isSelf: boolean;
}

export function getMemberProfile(token: string, workspaceId: string, memberId: string) {
  return apiRequest<MemberProfile>(`/api/workspaces/${workspaceId}/members/${memberId}`, token);
}
