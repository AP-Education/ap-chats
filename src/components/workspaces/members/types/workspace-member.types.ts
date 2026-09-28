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
  role: 'owner' | 'member';
  status: 'active' | 'removed';
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
