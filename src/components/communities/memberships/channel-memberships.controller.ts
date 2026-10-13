import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelPermissionsService } from '../channel-access/permissions';
import { ChannelMembershipsService } from './channel-memberships.service';

@Controller('workspaces/:workspaceId/channels/:channelId/members')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelMembershipsController {
  constructor(
    private readonly memberships: ChannelMembershipsService,
    private readonly permissions: ChannelPermissionsService,
  ) {}

  @Get()
  list(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.memberships.list(member, channelId);
  }

  @Delete('me')
  @HttpCode(204)
  leave(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ): Promise<void> {
    return this.permissions.leave(member, channelId);
  }
}
