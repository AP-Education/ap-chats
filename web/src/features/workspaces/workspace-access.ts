import type { WorkspaceAccessLevel, WorkspaceMember } from './types';

export const accessLevelLabels: Record<WorkspaceAccessLevel, string> = {
  owner: 'Адміністратор',
  manager: 'Менеджер',
  member: 'Учасник',
};

// Runs the structure (channels, roles, people); reading a channel still needs its lists.
export function isWorkspaceAdministrator(member: WorkspaceMember | undefined): boolean {
  return member?.accessLevel === 'owner' || member?.accessLevel === 'manager';
}

export function isWorkspaceOwner(member: WorkspaceMember | undefined): boolean {
  return member?.accessLevel === 'owner';
}
