import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { WorkspaceMembersRepository } from './repository';
import type { WorkspaceMember } from './types';

@Injectable()
export class WorkspaceMembersService {
  constructor(private readonly workspaceMembersRepository: WorkspaceMembersRepository) {}

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
    return {
      memberId: member.id,
      displayName: member.profile.displayName,
      avatarPath: member.profile.avatarPath,
      role: member.role,
      isSelf: member.id === viewer.id,
    };
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
