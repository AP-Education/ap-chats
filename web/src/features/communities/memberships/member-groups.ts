import type { TFunction } from 'i18next';

import type { Role } from '@/features/roles/types';

import { compareNames } from '../../../shared/lib/compare-names';
import type { ChannelMembership } from './types';

export interface MemberGroup {
  key: string;
  title: string;
  members: ChannelMembership[];
}

/**
 * Groups a channel's people under their top hoisted role, in role order, then everyone else,
 * each group by name.
 */
export function groupMembersByRole(
  memberships: ChannelMembership[],
  roles: Role[],
  nameOf: (memberId: string) => string,
  t: TFunction<'communities'>,
): MemberGroup[] {
  const byName = (a: ChannelMembership, b: ChannelMembership) =>
    compareNames(nameOf(a.memberId), nameOf(b.memberId));
  const hoisted = roles.filter((role) => role.isHoisted);
  const byRole = new Map<string, ChannelMembership[]>(hoisted.map((role) => [role.id, []]));
  const rest: ChannelMembership[] = [];

  for (const membership of memberships) {
    const group = membership.hoistedRoleId ? byRole.get(membership.hoistedRoleId) : undefined;
    if (group) group.push(membership);
    else rest.push(membership);
  }

  const roleGroups = hoisted
    .map((role) => ({
      key: role.id,
      title: role.name,
      members: (byRole.get(role.id) ?? []).sort(byName),
    }))
    .filter((group) => group.members.length > 0);
  const restGroup = rest.length
    ? [{ key: 'members', title: t(($) => $.members.title), members: rest.sort(byName) }]
    : [];

  return [...roleGroups, ...restGroup];
}
