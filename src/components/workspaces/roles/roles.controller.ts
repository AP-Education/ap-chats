import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';

import { CurrentWorkspaceMember } from '../members/decorators';
import { WorkspaceMemberGuard } from '../members/guards';
import type { WorkspaceMember } from '../members/types';
import { CreateRoleDto } from './dto/create-role.dto';
import { ReorderRolesDto } from './dto/reorder-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('workspaces/:workspaceId/roles')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list(@CurrentWorkspaceMember() member: WorkspaceMember) {
    return this.roles.list(member);
  }

  @Post()
  create(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: CreateRoleDto) {
    return this.roles.create(member, dto);
  }

  @Put('order')
  reorder(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: ReorderRolesDto) {
    return this.roles.reorder(member, dto.roleIds);
  }

  @Patch(':roleId')
  update(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(member, roleId, dto);
  }

  @Delete(':roleId')
  @HttpCode(204)
  remove(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    return this.roles.remove(member, roleId);
  }
}
