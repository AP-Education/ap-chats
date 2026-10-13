import type { Role } from '../types';

export abstract class RolesRepository {
  abstract findAllForWorkspace(workspaceId: string): Promise<Role[]>;
  abstract findById(workspaceId: string, roleId: string): Promise<Role | undefined>;
  abstract countInWorkspace(workspaceId: string, roleIds: string[]): Promise<number>;
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
  /** Deletes the role and its grants; resolves to the active people who held it. */
  abstract remove(workspaceId: string, roleId: string): Promise<string[] | undefined>;
}
