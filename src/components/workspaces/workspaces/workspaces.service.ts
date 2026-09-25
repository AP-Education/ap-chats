import { ForbiddenException, Injectable } from '@nestjs/common';

import { WorkspaceMembersRepository } from '../members/repository';
import type { CreateWorkspaceDto } from './dto/create-workspace.dto';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { type Workspace, WorkspacesRepository } from './repository';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
  ) {}

  create(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspacesRepository.create(userId, dto);
  }

  findAllForCurrentUser(userId: string): Promise<Workspace[]> {
    return this.workspacesRepository.findAllForMember(userId);
  }

  async update(
    workspaceId: string,
    requesterId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    await this.assertOwner(workspaceId, requesterId);
    return this.workspacesRepository.update(workspaceId, dto);
  }

  async delete(workspaceId: string, requesterId: string): Promise<void> {
    await this.assertOwner(workspaceId, requesterId);
    await this.workspacesRepository.delete(workspaceId);
  }

  private async assertOwner(workspaceId: string, userId: string): Promise<void> {
    const member = await this.workspaceMembersRepository.findForUser(workspaceId, userId);
    if (member?.role !== 'owner')
      throw new ForbiddenException('Only the workspace owner can do this');
  }
}
