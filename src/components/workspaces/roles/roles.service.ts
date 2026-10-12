import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { type AnnounceAccessChanges, isAdministrator, MemberAccessProjections } from '../access';
import type { WorkspaceMember } from '../members/types';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './repository';
import type { Role, RoleMember } from './types';

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly projections: MemberAccessProjections,
  ) {}

  list(member: WorkspaceMember): Promise<Role[]> {
    return this.roles.findAllForWorkspace(member.workspaceId);
  }

  async create(member: WorkspaceMember, dto: CreateRoleDto): Promise<Role> {
    this.requireAdministrator(member);
    const name = this.normalizeName(dto.name);

    return this.roles.create(member.workspaceId, { name, color: dto.color ?? null });
  }

  async update(member: WorkspaceMember, roleId: string, dto: UpdateRoleDto): Promise<Role> {
    this.requireAdministrator(member);
    const changesNothing =
      dto.name === undefined && dto.color === undefined && dto.isHoisted === undefined;
    if (changesNothing) throw new BadRequestException('No changes provided');

    const role = await this.roles.update(member.workspaceId, roleId, {
      ...(dto.name === undefined ? {} : { name: this.normalizeName(dto.name) }),
      ...(dto.color === undefined ? {} : { color: dto.color }),
      ...(dto.isHoisted === undefined ? {} : { isHoisted: dto.isHoisted }),
    });
    if (!role) throw new NotFoundException('Role not found');

    return role;
  }

  async reorder(member: WorkspaceMember, roleIds: string[]): Promise<Role[]> {
    this.requireAdministrator(member);

    await this.roles.reorder(member.workspaceId, [...new Set(roleIds)]);

    return this.roles.findAllForWorkspace(member.workspaceId);
  }

  async remove(member: WorkspaceMember, roleId: string): Promise<void> {
    this.requireAdministrator(member);

    const announce = await this.dissolve(member.workspaceId, roleId);
    announce();
  }

  async members(member: WorkspaceMember, roleId: string): Promise<RoleMember[]> {
    await this.requireRole(member.workspaceId, roleId);
    return this.roles.members(member.workspaceId, roleId);
  }

  async addMembers(member: WorkspaceMember, roleId: string, memberIds: string[]): Promise<void> {
    this.requireAdministrator(member);

    const announce = await this.enroll(member.workspaceId, roleId, memberIds);
    announce();
  }

  async removeMember(member: WorkspaceMember, roleId: string, memberId: string): Promise<void> {
    this.requireAdministrator(member);

    const announce = await this.release(member.workspaceId, roleId, memberId);
    announce();
  }

  @Transactional()
  private async dissolve(workspaceId: string, roleId: string): Promise<AnnounceAccessChanges> {
    const formerMemberIds = await this.roles.remove(workspaceId, roleId);
    if (!formerMemberIds) throw new NotFoundException('Role not found');

    return this.projections.refreshMembers(workspaceId, formerMemberIds);
  }

  @Transactional()
  private async enroll(
    workspaceId: string,
    roleId: string,
    memberIds: string[],
  ): Promise<AnnounceAccessChanges> {
    await this.requireRole(workspaceId, roleId);

    const addedIds = await this.roles.addMembers(workspaceId, roleId, memberIds);

    return this.projections.refreshMembers(workspaceId, addedIds);
  }

  @Transactional()
  private async release(
    workspaceId: string,
    roleId: string,
    memberId: string,
  ): Promise<AnnounceAccessChanges> {
    await this.requireRole(workspaceId, roleId);

    const wasMember = await this.roles.removeMember(workspaceId, roleId, memberId);
    if (!wasMember) throw new NotFoundException('Role member not found');

    return this.projections.refreshMembers(workspaceId, [memberId]);
  }

  private async requireRole(workspaceId: string, roleId: string): Promise<void> {
    const role = await this.roles.findById(workspaceId, roleId);
    if (!role) throw new NotFoundException('Role not found');
  }

  private requireAdministrator(member: WorkspaceMember): void {
    if (!isAdministrator(member))
      throw new ForbiddenException('Only workspace managers can manage roles');
  }

  private normalizeName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Role name cannot be blank');
    return trimmed;
  }
}
