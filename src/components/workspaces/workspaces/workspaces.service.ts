import { ForbiddenException, Injectable } from '@nestjs/common';

import type { WorkspaceMember } from '../members/types';
import type { CreateWorkspaceDto } from './dto/create-workspace.dto';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesRepository } from './repository';
import type { Workspace } from './types';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  create(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspacesRepository.create(userId, dto);
  }

  findAllForCurrentUser(userId: string): Promise<Workspace[]> {
    return this.workspacesRepository.findAllForMember(userId);
  }

  update(member: WorkspaceMember, dto: UpdateWorkspaceDto): Promise<Workspace> {
    this.assertOwner(member);
    return this.workspacesRepository.update(member.workspaceId, dto);
  }

  async delete(member: WorkspaceMember): Promise<void> {
    this.assertOwner(member);
    await this.workspacesRepository.delete(member.workspaceId);
  }

  private assertOwner(member: WorkspaceMember): void {
    if (member.role !== 'owner')
      throw new ForbiddenException('Only the workspace owner can do this');
  }
}
