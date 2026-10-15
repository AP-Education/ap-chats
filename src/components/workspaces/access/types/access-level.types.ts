export const workspaceAccessLevels = ['owner', 'manager', 'member'] as const;
export type WorkspaceAccessLevel = (typeof workspaceAccessLevels)[number];
