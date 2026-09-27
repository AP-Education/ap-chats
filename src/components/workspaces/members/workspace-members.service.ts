import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';

import { WorkspaceMembersRepository } from './repository';
import type { WorkspaceMember } from './types';

@Injectable()
export class WorkspaceMembersService {
  constructor(private readonly workspaceMembersRepository: WorkspaceMembersRepository) {}

  findAllForWorkspace(member: WorkspaceMember): Promise<WorkspaceMember[]> {
    return this.workspaceMembersRepository.findAllForWorkspace(member.workspaceId);
  }

  async remove(member: WorkspaceMember, targetUserId: string): Promise<void> {
    const isSelf = member.profile.oidcUserId === targetUserId;
    if (!isSelf && member.role !== 'owner') {
      throw new ForbiddenException('Only the workspace owner can remove other members');
    }
    if (isSelf && member.role === 'owner') {
      throw new ConflictException('Owner cannot leave a workspace; delete it instead');
    }

    await this.workspaceMembersRepository.remove(member.workspaceId, targetUserId);
  }
}
