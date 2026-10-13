import { Injectable } from '@nestjs/common';

import { RolesRepository } from './repository';

/** What other modules may ask about roles without reaching into their tables. */
@Injectable()
export class RolesFacade {
  constructor(private readonly roles: RolesRepository) {}

  exists(workspaceId: string, roleId: string): Promise<boolean> {
    return this.allInWorkspace(workspaceId, [roleId]);
  }

  async allInWorkspace(workspaceId: string, roleIds: string[]): Promise<boolean> {
    if (!roleIds.length) return true;

    const found = await this.roles.countInWorkspace(workspaceId, roleIds);
    return found === new Set(roleIds).size;
  }
}
