import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';

import { type WorkspaceMember, WorkspaceMembersRepository } from './repository';

@Injectable()
export class WorkspaceMembersService {
  constructor(private readonly workspaceMembersRepository: WorkspaceMembersRepository) {}

  async findAllForWorkspace(workspaceId: string, requesterId: string): Promise<WorkspaceMember[]> {
    const requester = await this.workspaceMembersRepository.findForUser(workspaceId, requesterId);
    if (!requester) throw new ForbiddenException('Not a member of this workspace');

    return this.workspaceMembersRepository.findAllForWorkspace(workspaceId);
  }

  async remove(workspaceId: string, requesterId: string, targetUserId: string): Promise<void> {
    const requester = await this.workspaceMembersRepository.findForUser(workspaceId, requesterId);
    if (!requester) throw new ForbiddenException('Not a member of this workspace');

    const isSelf = requesterId === targetUserId;
    if (!isSelf && requester.role !== 'owner') {
      throw new ForbiddenException('Only the workspace owner can remove other members');
    }
    if (isSelf && requester.role === 'owner') {
      throw new ConflictException('Owner cannot leave a workspace; delete it instead');
    }

    await this.workspaceMembersRepository.remove(workspaceId, targetUserId);
  }
}
