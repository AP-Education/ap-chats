import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';

import { CurrentWorkspaceMember } from './decorators';
import { ChangeAccessLevelDto } from './dto/change-access-level.dto';
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
    return this.members.search(member, query);
  }

  @Get(':memberId')
  profile(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.members.profile(member, memberId);
  }

  @Patch(':memberId/access-level')
  changeAccessLevel(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: ChangeAccessLevelDto,
  ): Promise<WorkspaceMember> {
    return this.members.changeAccessLevel(member, memberId, dto.accessLevel);
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
