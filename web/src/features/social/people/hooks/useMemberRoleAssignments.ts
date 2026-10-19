import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useRoleMembership } from '@/features/roles/hooks/useRoleMembership';
import type { RoleBadge } from '@/features/roles/types';

import type { MemberProfile } from '../api/member-profile-api';
import { peopleQueryKeys } from '../queryKeys';

/** Gives a person a role or takes it away, showing the change on their profile before the server confirms it. */
export function useMemberRoleAssignments(workspaceId: string, memberId: string) {
  const { t } = useTranslation('people');
  const { identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { add, remove } = useRoleMembership(workspaceId);
  const profileKey = peopleQueryKeys.profile(identity, workspaceId, memberId);

  function showOnProfile(role: RoleBadge, assigned: boolean): MemberProfile | undefined {
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
    return previous;
  }

  function toggleRole(role: RoleBadge, assigned: boolean) {
    const previous = showOnProfile(role, assigned);
    const onError = () => {
      queryClient.setQueryData(profileKey, previous);
      void message.error(t(($) => $.roles.changeFailed));
    };

    if (assigned) add.mutate({ roleId: role.id, memberIds: [memberId] }, { onError });
    else remove.mutate({ roleId: role.id, memberId }, { onError });
  }

  return { toggleRole };
}
