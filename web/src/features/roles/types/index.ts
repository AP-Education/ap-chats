/** A named group of people; it gives rights only where a channel lists it. */
export interface Role {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  /** Display order, top first; it never decides what anyone may do. */
  position: number;
  /** Its people are listed as their own group among a channel's members. */
  isHoisted: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** How a role shows next to a person, as on their profile. */
export interface RoleBadge {
  id: string;
  name: string;
  color: string | null;
}

export interface RoleMember {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

export interface RoleInput {
  name: string;
  color?: string | null;
  isHoisted?: boolean;
}
