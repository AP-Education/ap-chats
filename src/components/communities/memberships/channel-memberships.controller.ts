import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelMembershipsService } from './channel-memberships.service';

@Controller('workspaces/:workspaceId/channels/:channelId/members')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelMembershipsController {
  constructor(private readonly memberships: ChannelMembershipsService) {}

  @Get()
  list(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.memberships.list(member, channelId);
  }
}
