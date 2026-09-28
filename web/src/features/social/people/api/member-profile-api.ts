import { apiRequest } from '@/shared/api/http';

export interface MemberProfile {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  role: 'owner' | 'member';
  isSelf: boolean;
}

export function getMemberProfile(token: string, workspaceId: string, memberId: string) {
  return apiRequest<MemberProfile>(`/api/workspaces/${workspaceId}/members/${memberId}`, token);
}
