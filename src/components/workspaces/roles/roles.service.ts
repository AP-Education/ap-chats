import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { Announce } from '@/globals/publisher/types';

import { MemberAccessProjection, requireAccessLevel } from '../access';
import type { WorkspaceMember } from '../members/types';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './repository';
import type { Role } from './types';

/** The workspace's roles themselves: their names, colours and order. */
@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly dependents: MemberAccessProjection,
  ) {}

  list(member: WorkspaceMember): Promise<Role[]> {
    return this.roles.findAllForWorkspace(member.workspaceId);
  }

  async create(member: WorkspaceMember, dto: CreateRoleDto): Promise<Role> {
    requireAccessLevel(member, 'manager');

    return this.roles.create(member.workspaceId, { name: dto.name, color: dto.color ?? null });
  }

  async update(member: WorkspaceMember, roleId: string, dto: UpdateRoleDto): Promise<Role> {
    requireAccessLevel(member, 'manager');
    const changesNothing =
      dto.name === undefined && dto.color === undefined && dto.isHoisted === undefined;
    if (changesNothing) throw new BadRequestException('No changes provided');

    const role = await this.roles.update(member.workspaceId, roleId, dto);
    if (!role) throw new NotFoundException('Role not found');

    return role;
  }

  async reorder(member: WorkspaceMember, roleIds: string[]): Promise<Role[]> {
    requireAccessLevel(member, 'manager');

    await this.roles.reorder(member.workspaceId, [...new Set(roleIds)]);

    return this.roles.findAllForWorkspace(member.workspaceId);
  }

  async remove(member: WorkspaceMember, roleId: string): Promise<void> {
    requireAccessLevel(member, 'manager');

    const announce = await this.dissolve(member.workspaceId, roleId);
    announce();
  }

  // Whatever the role gave its people goes with it, in the same step.
  @Transactional()
  private async dissolve(workspaceId: string, roleId: string): Promise<Announce> {
    const formerHolderIds = await this.roles.remove(workspaceId, roleId);
    if (!formerHolderIds) throw new NotFoundException('Role not found');

    return this.dependents.refreshMembers(workspaceId, formerHolderIds);
  }
}
