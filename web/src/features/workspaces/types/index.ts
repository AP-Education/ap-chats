export interface Workspace {
  id: string;
  name: string;
  avatarPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  avatarPath?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  avatarPath?: string;
}

export interface UploadedFile {
  path: string;
  url: string;
}

/** How a member shows to others: a name, a picture, and whether a person or a bot. */
export interface MemberAppearance {
  displayName: string | null;
  avatarPath: string | null;
  isBot: boolean;
}

/** A member as lists, mentions and message headers show them. */
export interface MemberSummary extends MemberAppearance {
  memberId: string;
}

export interface MemberProfile extends MemberAppearance {
  id: string;
  /** The OIDC subject, or a reserved one such as bot:star-me for a bot. */
  oidcUserId: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userProfileId: string;
  profile: MemberProfile;
  role: 'owner' | 'member';
  status: 'active' | 'removed';
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
}
