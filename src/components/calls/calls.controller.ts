import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CallsService } from './calls.service';

@Controller('workspaces/:workspaceId/channels/:channelId/calls')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post()
  start(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.calls.start(member, channelId);
  }

  @Get('active')
  active(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.calls.active(member, channelId);
  }

  @Post(':callId/token')
  join(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.calls.join(member, channelId, callId);
  }

  @Post(':callId/decline')
  decline(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.calls.decline(member, channelId, callId);
  }

  @Post(':callId/leave')
  leave(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.calls.leave(member, channelId, callId);
  }
}
