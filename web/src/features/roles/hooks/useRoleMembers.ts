import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { communityQueryKeys } from '@/features/communities/queryKeys';

import { addRoleMembers, listRoleMembers, removeRoleMember } from '../api/roles-api';
import { roleQueryKeys } from '../queryKeys';
import type { RoleMember } from '../types';

interface RoleMembersResult {
  query: UseQueryResult<RoleMember[]>;
  add: UseMutationResult<void, Error, string[]>;
  remove: UseMutationResult<void, Error, string>;
}

export function useRoleMembers(workspaceId: string, roleId: string): RoleMembersResult {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const membersKey = roleQueryKeys.members(identity, workspaceId, roleId);

  function refreshRoleCounts() {
    void queryClient.invalidateQueries({ queryKey: membersKey });
    void queryClient.invalidateQueries({ queryKey: roleQueryKeys.roles(identity, workspaceId) });
    void queryClient.invalidateQueries({
      queryKey: communityQueryKeys.memberLists(identity, workspaceId),
    });
  }

  const query = useQuery({
    queryKey: membersKey,
    queryFn: () => listRoleMembers(token as string, workspaceId, roleId),
    enabled: Boolean(token),
  });

  const add = useMutation({
    mutationFn: (memberIds: string[]) =>
      addRoleMembers(token as string, workspaceId, roleId, memberIds),
    onSuccess: refreshRoleCounts,
  });

  const remove = useMutation({
    mutationFn: (memberId: string) =>
      removeRoleMember(token as string, workspaceId, roleId, memberId),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<RoleMember[]>(membersKey);
      queryClient.setQueryData<RoleMember[]>(membersKey, (members) =>
        members?.filter((member) => member.memberId !== memberId),
      );
      return { previous };
    },
    onError: (_error, _memberId, context) => {
      if (context?.previous) queryClient.setQueryData(membersKey, context.previous);
    },
    onSettled: refreshRoleCounts,
  });

  return { query, add, remove };
}
