import type { Role, RoleBadge, RoleMember } from '../types';

export abstract class RolesRepository {
  abstract findAllForWorkspace(workspaceId: string): Promise<Role[]>;
  abstract findById(workspaceId: string, roleId: string): Promise<Role | undefined>;
  abstract create(
    workspaceId: string,
    values: { name: string; color: string | null },
  ): Promise<Role>;
  abstract update(
    workspaceId: string,
    roleId: string,
    changes: { name?: string; color?: string | null; isHoisted?: boolean },
  ): Promise<Role | undefined>;
  /** Puts the given roles in this order; roles left out keep their place after them. */
  abstract reorder(workspaceId: string, roleIds: string[]): Promise<void>;
  abstract badgesOf(workspaceId: string, memberId: string): Promise<RoleBadge[]>;
  /** Deletes the role and its grants; resolves to the people who were in it. */
  abstract remove(workspaceId: string, roleId: string): Promise<string[] | undefined>;
  abstract members(workspaceId: string, roleId: string): Promise<RoleMember[]>;
  /** Resolves to the active people who were not in the role yet. */
  abstract addMembers(workspaceId: string, roleId: string, memberIds: string[]): Promise<string[]>;
  abstract removeMember(workspaceId: string, roleId: string, memberId: string): Promise<boolean>;
}
