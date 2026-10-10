import { ForbiddenException, Injectable } from '@nestjs/common';

import { EventPublisher } from '@/globals/publisher/event-publisher';

import { WorkspaceMembersRepository } from '../members/repository';
import type { WorkspaceMember } from '../members/types';
import type { CreateWorkspaceDto } from './dto/create-workspace.dto';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WORKSPACE_DELETED_EVENT, WorkspaceDeletedEvent } from './events/workspace-deleted.event';
import { WorkspacesRepository } from './repository';
import type { Workspace } from './types';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceMembers: WorkspaceMembersRepository,
    private readonly events: EventPublisher,
  ) {}

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
    const members = await this.workspaceMembers.findAllForWorkspace(member.workspaceId);

    await this.workspacesRepository.delete(member.workspaceId);

    this.events.publish(
      WORKSPACE_DELETED_EVENT,
      new WorkspaceDeletedEvent(
        member.workspaceId,
        members.map((workspaceMember) => workspaceMember.profile.oidcUserId),
      ),
    );
  }

  private assertOwner(member: WorkspaceMember): void {
    if (member.role !== 'owner')
      throw new ForbiddenException('Only the workspace owner can do this');
  }
}
