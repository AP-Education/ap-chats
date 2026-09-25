import { Controller, Delete, Get, HttpCode, Param, UseGuards } from '@nestjs/common';

import { type AuthenticatedUser, AuthGuard, CurrentUser } from '@/components/auth';

import type { WorkspaceMember } from './repository';
import { WorkspaceMembersService } from './workspace-members.service';

@Controller('workspaces/:workspaceId/members')
@UseGuards(AuthGuard)
export class WorkspaceMembersController {
  constructor(private readonly members: WorkspaceMembersService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    return this.members.findAllForWorkspace(workspaceId, user.sub);
  }

  @Delete(':userId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.members.remove(workspaceId, user.sub, userId);
  }
}
