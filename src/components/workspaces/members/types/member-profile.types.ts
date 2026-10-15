import type { WorkspaceAccessLevel } from '../../access/types';

/** How a member shows to others: a name, a picture, and whether a person or a bot. */
export interface MemberAppearance {
  displayName: string | null;
  avatarPath: string | null;
  isBot: boolean;
}

/** A person as lists show them: who, by name and face. */
export interface MemberSummary extends MemberAppearance {
  memberId: string;
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
