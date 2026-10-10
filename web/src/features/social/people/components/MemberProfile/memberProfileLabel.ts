import type { MemberSummary } from '../../types';

export function memberProfileLabel(member: MemberSummary) {
  return member.displayName ? `Профіль ${member.displayName}` : 'Профіль учасника';
}
