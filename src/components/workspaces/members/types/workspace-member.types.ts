import type { MemberProfile } from './member-appearance.types';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userProfileId: string;
  profile: MemberProfile;
  role: 'owner' | 'member';
  status: 'active' | 'removed';
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
