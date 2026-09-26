import { Controller, Delete, Get, HttpCode, Param } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';

import { CurrentWorkspaceMember } from './decorators';
import { WorkspaceMemberGuard } from './guards';
import type { WorkspaceMember } from './types';
import { WorkspaceMembersService } from './workspace-members.service';

@Controller('workspaces/:workspaceId/members')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class WorkspaceMembersController {
  constructor(private readonly members: WorkspaceMembersService) {}

  @Get()
  findAll(@CurrentWorkspaceMember() member: WorkspaceMember): Promise<WorkspaceMember[]> {
    return this.members.findAllForWorkspace(member);
  }

  @Delete(':userId')
  @HttpCode(204)
  remove(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.members.remove(member, userId);
  }
}
