import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isAdministrator, isOwner, outranks } from '../access/workspace-access';
import { RolesRepository } from '../roles/repository';
import { WorkspaceMembersRepository } from './repository';
import type { WorkspaceAccessLevel, WorkspaceMember } from './types';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
    private readonly roles: RolesRepository,
  ) {}

  findAllForWorkspace(member: WorkspaceMember): Promise<WorkspaceMember[]> {
    return this.workspaceMembersRepository.findAllForWorkspace(member.workspaceId);
  }

  search(member: WorkspaceMember, query: string) {
    return this.workspaceMembersRepository.search(
      member.workspaceId,
      member.id,
      query.trim().slice(0, 80),
    );
  }

  async profile(viewer: WorkspaceMember, memberId: string) {
    const member = await this.workspaceMembersRepository.findById(viewer.workspaceId, memberId);
    if (!member) throw new NotFoundException('Workspace member not found');

    const roles = await this.roles.badgesOf(viewer.workspaceId, member.id);

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
    if (!isOwner(owner))
      throw new ForbiddenException('Only a workspace owner can change access levels');
    // Owners never change themselves, so a workspace always keeps at least one.
    if (memberId === owner.id)
      throw new ConflictException('Owners cannot change their own access level');

    const changed = await this.workspaceMembersRepository.changeAccessLevel(
      owner.workspaceId,
      memberId,
      accessLevel,
    );
    if (!changed) throw new NotFoundException('Workspace member not found');

    return changed;
  }

  async remove(member: WorkspaceMember, targetUserId: string): Promise<void> {
    const isSelf = member.profile.oidcUserId === targetUserId;
    if (isSelf && isOwner(member))
      throw new ConflictException('Owner cannot leave a workspace; delete it instead');

    if (!isSelf) {
      const target = await this.workspaceMembersRepository.findForUser(
        member.workspaceId,
        targetUserId,
      );
      if (!target) throw new NotFoundException('Workspace member not found');

      const mayRemove = isAdministrator(member) && outranks(member, target);
      if (!mayRemove)
        throw new ForbiddenException('Only someone with a higher access level can remove a member');
    }

    await this.workspaceMembersRepository.remove(member.workspaceId, targetUserId);
  }
}
