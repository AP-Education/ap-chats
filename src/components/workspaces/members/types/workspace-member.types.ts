import type { WorkspaceAccessLevel } from '../../access/types';

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
