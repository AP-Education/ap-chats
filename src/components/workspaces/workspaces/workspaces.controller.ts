import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';

import { type AuthenticatedUser, CurrentUser, UseAuthGuards } from '@/components/auth';

import { CurrentWorkspaceMember } from '../members/decorators';
import { WorkspaceMemberGuard } from '../members/guards';
import type { WorkspaceMember } from '../members/types';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import type { Workspace } from './types';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  @UseAuthGuards()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaces.create(user.sub, dto);
  }

  @Get()
  @UseAuthGuards()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Workspace[]> {
    return this.workspaces.findAllForCurrentUser(user.sub);
  }

  @Patch(':workspaceId')
  @UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
  update(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaces.update(member, dto);
  }

  @Delete(':workspaceId')
  @UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
  @HttpCode(204)
  delete(@CurrentWorkspaceMember() member: WorkspaceMember): Promise<void> {
    return this.workspaces.delete(member);
  }
}
