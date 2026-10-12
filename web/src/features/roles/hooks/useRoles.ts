import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { communityQueryKeys } from '@/features/communities/queryKeys';

import { createRole, deleteRole, listRoles, reorderRoles, updateRole } from '../api/roles-api';
import { roleQueryKeys } from '../queryKeys';
import type { Role, RoleInput } from '../types';

interface UpdateRoleParams {
  roleId: string;
  input: Partial<RoleInput>;
}

interface RolesResult {
  query: UseQueryResult<Role[]>;
  create: UseMutationResult<Role, Error, RoleInput>;
  update: UseMutationResult<Role, Error, UpdateRoleParams>;
  reorder: UseMutationResult<Role[], Error, string[], { previous: Role[] | undefined }>;
  remove: UseMutationResult<void, Error, string>;
}

export function useRoles(workspaceId: string | undefined): RolesResult {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = roleQueryKeys.roles(identity, workspaceId);

  // Hoist, order and colour decide how channel members are grouped and coloured.
  function refreshMemberLists() {
    void queryClient.invalidateQueries({
      queryKey: communityQueryKeys.memberLists(identity, workspaceId),
    });
  }

  const query = useQuery({
    queryKey,
    queryFn: () => listRoles(token as string, workspaceId as string),
    enabled: Boolean(token && workspaceId),
  });

  const create = useMutation({
    mutationFn: (input: RoleInput) => createRole(token as string, workspaceId as string, input),
    onSuccess: (role) => {
      queryClient.setQueryData<Role[]>(queryKey, (roles) => [...(roles ?? []), role]);
    },
  });

  const update = useMutation({
    mutationFn: ({ roleId, input }: UpdateRoleParams) =>
      updateRole(token as string, workspaceId as string, roleId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Role[]>(queryKey, (roles) =>
        roles?.map((role) => (role.id === updated.id ? updated : role)),
      );
      refreshMemberLists();
    },
  });

  const reorder = useMutation({
    mutationFn: (roleIds: string[]) =>
      reorderRoles(token as string, workspaceId as string, roleIds),
    onMutate: async (roleIds) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Role[]>(queryKey);
      const byId = new Map(previous?.map((role) => [role.id, role]));
      queryClient.setQueryData<Role[]>(queryKey, () => roleIds.flatMap((id) => byId.get(id) ?? []));
      return { previous };
    },
    onError: (_error, _roleIds, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (roles) => {
      queryClient.setQueryData(queryKey, roles);
      refreshMemberLists();
    },
  });

  // Deleting a role closes the channels it opened, so the channel lists change too.
  const remove = useMutation({
    mutationFn: (roleId: string) => deleteRole(token as string, workspaceId as string, roleId),
    onSuccess: (_result, roleId) => {
      queryClient.setQueryData<Role[]>(queryKey, (roles) =>
        roles?.filter((role) => role.id !== roleId),
      );
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.channelLists(identity, workspaceId),
      });
    },
  });

  return { query, create, update, reorder, remove };
}
