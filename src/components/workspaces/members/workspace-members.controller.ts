import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Query } from '@nestjs/common';

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

  @Get('search')
  search(@CurrentWorkspaceMember() member: WorkspaceMember, @Query('q') query = '') {
    return query.trim() ? this.members.search(member, query) : [];
  }

  @Get(':memberId')
  profile(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.members.profile(member, memberId);
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
