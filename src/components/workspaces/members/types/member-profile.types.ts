import type { WorkspaceAccessLevel } from '../../access/types';

/** A person as lists show them: who, by name and face. */
export interface MemberSummary {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

/** How a role shows next to a person, as on their profile. */
export interface RoleBadge {
  id: string;
  name: string;
  color: string | null;
}

export interface MemberProfile extends MemberSummary {
  accessLevel: WorkspaceAccessLevel;
  /** Top role first. */
  roles: RoleBadge[];
  isSelf: boolean;
}
