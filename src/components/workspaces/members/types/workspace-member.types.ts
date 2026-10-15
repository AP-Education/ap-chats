import type { WorkspaceAccessLevel } from '../../access/types';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userProfileId: string;
  profile: {
    id: string;
    /** The OIDC subject, or a reserved one such as bot:star-me for a bot. */
    oidcUserId: string;
    displayName: string | null;
    avatarPath: string | null;
    isBot: boolean;
  };
  accessLevel: WorkspaceAccessLevel;
  status: 'active' | 'removed';
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
