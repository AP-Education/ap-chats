import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';

import { CurrentWorkspaceMember } from '../members/decorators';
import { WorkspaceMemberGuard } from '../members/guards';
import type { WorkspaceMember } from '../members/types';
import { AddRoleMembersDto } from './dto/add-role-members.dto';
import { RoleMembersService } from './role-members.service';

@Controller('workspaces/:workspaceId/roles/:roleId/members')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class RoleMembersController {
  constructor(private readonly roleMembers: RoleMembersService) {}

  @Get()
  list(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.roleMembers.list(member, roleId);
  }

  @Post()
  @HttpCode(204)
  add(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: AddRoleMembersDto,
  ): Promise<void> {
    return this.roleMembers.add(member, roleId, dto.memberIds);
  }

  @Delete(':memberId')
  @HttpCode(204)
  remove(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    return this.roleMembers.remove(member, roleId, memberId);
  }
}
