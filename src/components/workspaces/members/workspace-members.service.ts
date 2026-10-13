import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import {
  isAdministrator,
  isOwner,
  MemberAccessProjections,
  outranks,
  requireAccessLevel,
} from '../access';
import type { AnnounceAccessChanges, WorkspaceAccessLevel } from '../access/types';
import { WorkspaceMembersRepository } from './repository';
import type { MemberProfile, MemberSummary, WorkspaceMember } from './types';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
    private readonly projections: MemberAccessProjections,
  ) {}

  findAllForWorkspace(member: WorkspaceMember): Promise<WorkspaceMember[]> {
    return this.workspaceMembersRepository.findAllForWorkspace(member.workspaceId);
  }

  async search(member: WorkspaceMember, query: string): Promise<MemberSummary[]> {
    const text = query.trim().slice(0, 80);
    if (!text) return [];

    return this.workspaceMembersRepository.search(member.workspaceId, member.id, text);
  }

  async profile(viewer: WorkspaceMember, memberId: string): Promise<MemberProfile> {
    const member = await this.workspaceMembersRepository.findById(viewer.workspaceId, memberId);
    if (!member) throw new NotFoundException('Workspace member not found');

    const roles = await this.workspaceMembersRepository.roleBadgesOf(viewer.workspaceId, member.id);

    return {
      memberId: member.id,
      displayName: member.profile.displayName,
      avatarPath: member.profile.avatarPath,
      accessLevel: member.accessLevel,
      roles,
      isSelf: member.id === viewer.id,
    };
  }

  async changeAccessLevel(
    owner: WorkspaceMember,
    memberId: string,
    accessLevel: WorkspaceAccessLevel,
  ): Promise<WorkspaceMember> {
    requireAccessLevel(owner, 'owner');
    // Owners never change themselves, so a workspace always keeps at least one.
    const isSelf = memberId === owner.id;
    if (isSelf) throw new ConflictException('Owners cannot change their own access level');

    const changed = await this.workspaceMembersRepository.changeAccessLevel(
      owner.workspaceId,
      memberId,
      accessLevel,
    );
    if (!changed) throw new NotFoundException('Workspace member not found');

    return changed;
  }

  async remove(member: WorkspaceMember, targetUserId: string): Promise<void> {
    const announce = await this.dismiss(member, targetUserId);
    announce();
  }

  // Whoever leaves the workspace leaves its channels in the same step.
  @Transactional()
  private async dismiss(
    actor: WorkspaceMember,
    targetUserId: string,
  ): Promise<AnnounceAccessChanges> {
    const isSelf = actor.profile.oidcUserId === targetUserId;
    const target = isSelf ? actor : await this.requireOutranked(actor, targetUserId);
    if (isSelf && isOwner(actor))
      throw new ConflictException('Owner cannot leave a workspace; delete it instead');

    await this.workspaceMembersRepository.remove(actor.workspaceId, targetUserId);

    return this.projections.refreshMembers(actor.workspaceId, [target.id]);
  }

  private async requireOutranked(
    actor: WorkspaceMember,
    targetUserId: string,
  ): Promise<WorkspaceMember> {
    const target = await this.workspaceMembersRepository.findForUser(
      actor.workspaceId,
      targetUserId,
    );
    if (!target) throw new NotFoundException('Workspace member not found');

    const mayRemove = isAdministrator(actor) && outranks(actor, target);
    if (!mayRemove)
      throw new ForbiddenException('Only someone with a higher access level can remove a member');

    return target;
  }
}
