import type { TFunction } from 'i18next';

import type { MemberSummary } from '../../types';

export function memberProfileLabel(member: MemberSummary, t: TFunction<'people'>) {
  return member.displayName
    ? t(($) => $.profileLabel, { name: member.displayName })
    : t(($) => $.memberProfileLabel);
}
