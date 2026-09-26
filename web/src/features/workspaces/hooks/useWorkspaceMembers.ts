import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { listWorkspaceMembers } from '../api/workspace-members-api';
import type { WorkspaceMember } from '../types';

export function useWorkspaceMembers(
  workspaceId: string | undefined,
): UseQueryResult<WorkspaceMember[]> {
  const { token, identity } = useQueryAuth();

  return useQuery({
    queryKey: ['workspace-members', identity, workspaceId],
    queryFn: () => listWorkspaceMembers(token as string, workspaceId as string),
    enabled: Boolean(token && workspaceId),
  });
}
