import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { addRoleMembers, removeRoleMember } from '../api/roles-api';
import { roleQueryKeys } from '../queryKeys';
import { roleChangeKey } from '../role-changes';
import type { RoleMember } from '../types';

interface Enrollment {
  roleId: string;
  memberIds: string[];
}

interface Release {
  roleId: string;
  memberId: string;
}

interface RoleMembership {
  add: UseMutationResult<void, Error, Enrollment>;
  remove: UseMutationResult<void, Error, Release, { previous: RoleMember[] | undefined }>;
}

/** The one place a person joins or leaves a role, from the roles settings or a profile alike. */
export function useRoleMembership(workspaceId: string): RoleMembership {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const mutationKey = roleChangeKey(identity, workspaceId);

  function refreshRole(roleId: string) {
    void queryClient.invalidateQueries({
      queryKey: roleQueryKeys.members(identity, workspaceId, roleId),
    });
    void queryClient.invalidateQueries({ queryKey: roleQueryKeys.roles(identity, workspaceId) });
  }

  const add = useMutation({
    mutationKey,
    mutationFn: ({ roleId, memberIds }: Enrollment) =>
      addRoleMembers(token as string, workspaceId, roleId, memberIds),
    onSuccess: (_result, { roleId }) => refreshRole(roleId),
  });

  const remove = useMutation({
    mutationKey,
    mutationFn: ({ roleId, memberId }: Release) =>
      removeRoleMember(token as string, workspaceId, roleId, memberId),
    onMutate: async ({ roleId, memberId }) => {
      const membersKey = roleQueryKeys.members(identity, workspaceId, roleId);
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<RoleMember[]>(membersKey);
      queryClient.setQueryData<RoleMember[]>(membersKey, (members) =>
        members?.filter((member) => member.memberId !== memberId),
      );
      return { previous };
    },
    onError: (_error, { roleId }, context) => {
      if (context?.previous)
        queryClient.setQueryData(
          roleQueryKeys.members(identity, workspaceId, roleId),
          context.previous,
        );
    },
    onSettled: (_result, _error, { roleId }) => refreshRole(roleId),
  });

  return { add, remove };
}
