import { Injectable } from '@nestjs/common';

import { requireAccessLevel } from '../access';
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

  async update(member: WorkspaceMember, dto: UpdateWorkspaceDto): Promise<Workspace> {
    requireAccessLevel(member, 'owner');

    return this.workspacesRepository.update(member.workspaceId, dto);
  }

  async delete(member: WorkspaceMember): Promise<void> {
    requireAccessLevel(member, 'owner');

    await this.workspacesRepository.delete(member.workspaceId);
  }
}
