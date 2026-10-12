import type { WorkspaceAccessLevel, WorkspaceMember } from '../members/types';

type Leveled = Pick<WorkspaceMember, 'accessLevel'>;

const rank: Record<WorkspaceAccessLevel, number> = { member: 0, manager: 1, owner: 2 };

// Runs the structure (channels, roles, people), not the content: reading a channel still needs its lists.
export function isAdministrator(member: Leveled): boolean {
  return rank[member.accessLevel] >= rank.manager;
}

export function isOwner(member: Leveled): boolean {
  return member.accessLevel === 'owner';
}

export function outranks(actor: Leveled, target: Leveled): boolean {
  return rank[actor.accessLevel] > rank[target.accessLevel];
}
