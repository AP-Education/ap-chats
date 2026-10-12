export const workspaceAccessLevels = ['owner', 'manager', 'member'] as const;
export type WorkspaceAccessLevel = (typeof workspaceAccessLevels)[number];

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userProfileId: string;
  profile: {
    id: string;
    oidcUserId: string;
    displayName: string | null;
    avatarPath: string | null;
  };
  accessLevel: WorkspaceAccessLevel;
  status: 'active' | 'removed';
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
