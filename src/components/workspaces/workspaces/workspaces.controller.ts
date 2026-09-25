import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { type AuthenticatedUser, AuthGuard, CurrentUser } from '@/components/auth';

import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import type { Workspace } from './repository';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaces.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Workspace[]> {
    return this.workspaces.findAllForCurrentUser(user.sub);
  }

  @Patch(':workspaceId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaces.update(workspaceId, user.sub, dto);
  }

  @Delete(':workspaceId')
  @HttpCode(204)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.workspaces.delete(workspaceId, user.sub);
  }
}
