import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/stores/current-user-context';

import { listWorkspaceMembers } from '../api/workspace-members-api';
import type { WorkspaceMember } from '../types';

export function useWorkspaceMembers(
  workspaceId: string | undefined,
): UseQueryResult<WorkspaceMember[]> {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;

  return useQuery({
    queryKey: ['workspace-members', workspaceId, token],
    queryFn: () => listWorkspaceMembers(token as string, workspaceId as string),
    enabled: Boolean(token && workspaceId),
  });
}
