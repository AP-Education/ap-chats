import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { communityQueryKeys } from '@/features/communities/queryKeys';
import { addRoleMembers, removeRoleMember } from '@/features/roles/api/roles-api';
import { roleQueryKeys } from '@/features/roles/queryKeys';
import type { RoleBadge } from '@/features/roles/types';

import type { MemberProfile } from '../api/member-profile-api';
import { peopleQueryKeys } from '../queryKeys';

interface RoleToggle {
  role: RoleBadge;
  assigned: boolean;
}

/** Gives a person a role or takes it away, showing the change before the server confirms it. */
export function useMemberRoleAssignments(workspaceId: string, memberId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const profileKey = peopleQueryKeys.profile(identity, workspaceId, memberId);

  const toggle = useMutation({
    mutationFn: ({ role, assigned }: RoleToggle) =>
      assigned
        ? addRoleMembers(token as string, workspaceId, role.id, [memberId])
        : removeRoleMember(token as string, workspaceId, role.id, memberId),
    onMutate: async ({ role, assigned }) => {
      await queryClient.cancelQueries({ queryKey: profileKey });
      const previous = queryClient.getQueryData<MemberProfile>(profileKey);
      queryClient.setQueryData<MemberProfile>(
        profileKey,
        (profile) =>
          profile && {
            ...profile,
            roles: assigned
              ? [...profile.roles, { id: role.id, name: role.name, color: role.color }]
              : profile.roles.filter((badge) => badge.id !== role.id),
          },
      );
      return { previous };
    },
    onError: (_error, _toggle, context) => {
      if (context?.previous) queryClient.setQueryData(profileKey, context.previous);
      void message.error('Не вдалося змінити ролі.');
    },
    onSettled: (_result, _error, { role }) => {
      void queryClient.invalidateQueries({ queryKey: profileKey });
      void queryClient.invalidateQueries({ queryKey: roleQueryKeys.roles(identity, workspaceId) });
      void queryClient.invalidateQueries({
        queryKey: roleQueryKeys.members(identity, workspaceId, role.id),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.memberLists(identity, workspaceId),
      });
    },
  });

  return {
    toggleRole: (role: RoleBadge, assigned: boolean) => toggle.mutate({ role, assigned }),
  };
}
