import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelPermissionsService } from './channel-permissions.service';
import { ChannelPermissionsDto, toChannelPermissions } from './dto/channel-permissions.dto';

@Controller('workspaces/:workspaceId/channels/:channelId/permissions')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelPermissionsController {
  constructor(private readonly permissions: ChannelPermissionsService) {}

  @Get()
  describe(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.permissions.describe(member, channelId);
  }

  @Put()
  change(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: ChannelPermissionsDto,
  ) {
    return this.permissions.change(member, channelId, toChannelPermissions(dto));
  }
}
