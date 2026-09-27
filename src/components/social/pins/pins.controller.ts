import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { PinsFacade } from './pins.facade';

@Controller('workspaces/:workspaceId/channels/:channelId/pins')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class PinsController {
  constructor(private readonly pins: PinsFacade) {}

  @Get()
  list(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.pins.list(member, channelId);
  }

  @Put(':messageId')
  add(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.pins.add(member, channelId, messageId);
  }

  @Delete(':messageId')
  @HttpCode(204)
  remove(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.pins.remove(member, channelId, messageId);
  }
}
