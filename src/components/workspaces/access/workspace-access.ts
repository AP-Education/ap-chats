import { ForbiddenException } from '@nestjs/common';

import type { WorkspaceAccessLevel } from './types';

interface Leveled {
  accessLevel: WorkspaceAccessLevel;
}

const rank: Record<WorkspaceAccessLevel, number> = { member: 0, manager: 1, owner: 2 };

const refusals: Record<WorkspaceAccessLevel, string> = {
  member: 'Not a member of this workspace',
  manager: 'Only workspace managers can do this',
  owner: 'Only the workspace owner can do this',
};

export function hasAccessLevel(member: Leveled, level: WorkspaceAccessLevel): boolean {
  return rank[member.accessLevel] >= rank[level];
}

/** The one check behind every "only managers" and "only the owner" rule, whatever the entry point. */
export function requireAccessLevel(member: Leveled, level: WorkspaceAccessLevel): void {
  if (!hasAccessLevel(member, level)) throw new ForbiddenException(refusals[level]);
}

// Runs the structure (channels, roles, people), not the content: reading a channel still needs its lists.
export function isAdministrator(member: Leveled): boolean {
  return hasAccessLevel(member, 'manager');
}

export function isOwner(member: Leveled): boolean {
  return hasAccessLevel(member, 'owner');
}

export function outranks(actor: Leveled, target: Leveled): boolean {
  return rank[actor.accessLevel] > rank[target.accessLevel];
}
