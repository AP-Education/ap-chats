import { createContext, useContext } from 'react';

import type { RoleBadge } from '@/features/roles/types';

import type { MemberProfile } from '../api/member-profile-api';

/** The person whose card is open, and what the viewer may do on it. */
export interface MemberCardScope {
  workspaceId: string;
  memberId: string;
  /** Absent while it loads, and when the person is out of reach. */
  profile: MemberProfile | undefined;
  isLoading: boolean;
  /** Gone from the workspace, or never visible to the viewer. */
  unavailable: boolean;
  /** The workspace owner moves other people between access levels. */
  canChangeLevel: boolean;
  /** Workspace managers give and take roles. */
  canManageRoles: boolean;
  assignedRoleIds: ReadonlySet<string>;
  toggleRole: (role: RoleBadge, assigned: boolean) => void;
}

export const MemberCardContext = createContext<MemberCardScope | null>(null);

export function useMemberCard(): MemberCardScope {
  const value = useContext(MemberCardContext);
  if (!value) {
    throw new Error('useMemberCard must be used within MemberCard');
  }
  return value;
}
