import type { WorkspaceMember } from './types';

// Runs the structure (channels, roles, people); reading a channel still needs its lists.
export function isWorkspaceAdministrator(member: WorkspaceMember | undefined): boolean {
  return member?.accessLevel === 'owner' || member?.accessLevel === 'manager';
}

export function isWorkspaceOwner(member: WorkspaceMember | undefined): boolean {
  return member?.accessLevel === 'owner';
}
