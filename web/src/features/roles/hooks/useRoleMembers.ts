import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { listRoleMembers } from '../api/roles-api';
import { roleQueryKeys } from '../queryKeys';
import type { RoleMember } from '../types';

export function useRoleMembers(workspaceId: string, roleId: string): UseQueryResult<RoleMember[]> {
  const { token, identity } = useQueryAuth();

  return useQuery({
    queryKey: roleQueryKeys.members(identity, workspaceId, roleId),
    queryFn: () => listRoleMembers(token as string, workspaceId, roleId),
    enabled: Boolean(token),
  });
}
