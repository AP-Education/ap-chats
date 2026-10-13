import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { MemberAccessProjection, requireAccessLevel } from '../access';
import type { AnnounceAccessChanges } from '../access/types';
import type { MemberSummary, WorkspaceMember } from '../members/types';
import { RolesFacade } from '../roles/roles.facade';
import { RoleMembersRepository } from './repository/role-members.repository';

/** Who is in each role; whatever access a role gives follows its people in the same step. */
@Injectable()
export class RoleMembersService {
  constructor(
    private readonly roleMembers: RoleMembersRepository,
    private readonly roles: RolesFacade,
    private readonly dependents: MemberAccessProjection,
  ) {}

  async list(member: WorkspaceMember, roleId: string): Promise<MemberSummary[]> {
    await this.requireRole(member.workspaceId, roleId);

    return this.roleMembers.holders(member.workspaceId, roleId);
  }

  async add(member: WorkspaceMember, roleId: string, memberIds: string[]): Promise<void> {
    requireAccessLevel(member, 'manager');

    const announce = await this.enroll(member.workspaceId, roleId, memberIds);
    announce();
  }

  async remove(member: WorkspaceMember, roleId: string, memberId: string): Promise<void> {
    requireAccessLevel(member, 'manager');

    const announce = await this.release(member.workspaceId, roleId, memberId);
    announce();
  }

  @Transactional()
  private async enroll(
    workspaceId: string,
    roleId: string,
    memberIds: string[],
  ): Promise<AnnounceAccessChanges> {
    await this.requireRole(workspaceId, roleId);

    const addedIds = await this.roleMembers.enroll(workspaceId, roleId, memberIds);

    return this.dependents.refreshMembers(workspaceId, addedIds);
  }

  @Transactional()
  private async release(
    workspaceId: string,
    roleId: string,
    memberId: string,
  ): Promise<AnnounceAccessChanges> {
    await this.requireRole(workspaceId, roleId);

    const wasHolder = await this.roleMembers.release(workspaceId, roleId, memberId);
    if (!wasHolder) throw new NotFoundException('Role member not found');

    return this.dependents.refreshMembers(workspaceId, [memberId]);
  }

  private async requireRole(workspaceId: string, roleId: string): Promise<void> {
    const isRole = await this.roles.exists(workspaceId, roleId);
    if (!isRole) throw new NotFoundException('Role not found');
  }
}
