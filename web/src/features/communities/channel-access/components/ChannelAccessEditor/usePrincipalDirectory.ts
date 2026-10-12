import { useRoles } from '@/features/roles/hooks/useRoles';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import { compareNames } from '@/shared/lib/compare-names';

import { principalKey } from '../../principals';
import type { Principal } from '../../types';

/** What the editor shows for a principal: its name and how it is drawn. */
export type PrincipalDetails =
  | { key: string; kind: 'everyone'; name: string }
  | { key: string; kind: 'role'; name: string; color: string | null }
  | { key: string; kind: 'member'; name: string; avatarPath: string | null };

const everyone: PrincipalDetails = {
  key: principalKey({ kind: 'everyone' }),
  kind: 'everyone',
  name: 'Уся компанія',
};

export function usePrincipalDirectory(workspaceId: string) {
  const { query: roles } = useRoles(workspaceId);
  const members = useWorkspaceMembers(workspaceId);

  const known: PrincipalDetails[] = [
    everyone,
    ...(roles.data ?? []).map((role) => ({
      key: principalKey({ kind: 'role', roleId: role.id }),
      kind: 'role' as const,
      name: role.name,
      color: role.color,
    })),
    ...(members.data ?? [])
      .map((member) => ({
        key: principalKey({ kind: 'member', memberId: member.id }),
        kind: 'member' as const,
        name: member.profile.displayName ?? 'Ім’я недоступне',
        avatarPath: member.profile.avatarPath,
      }))
      .sort((a, b) => compareNames(a.name, b.name)),
  ];
  const byKey = new Map(known.map((details) => [details.key, details]));

  // A role deleted or a person gone since the lists were read still has a row to remove.
  function describe(principal: Principal): PrincipalDetails {
    const key = principalKey(principal);
    return byKey.get(key) ?? { key, kind: 'member', name: 'Недоступно', avatarPath: null };
  }

  return { known, describe, isLoading: roles.isPending || members.isPending };
}
