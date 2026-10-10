import { Controller, Delete, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ReactionsFacade } from './reactions.facade';

@Controller('workspaces/:workspaceId/channels/:channelId/messages/:messageId/reactions')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ReactionsController {
  constructor(private readonly reactions: ReactionsFacade) {}

  @Get()
  reactors(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query('emoji') emoji?: string,
  ) {
    return this.reactions.reactors(member, channelId, messageId, emoji);
  }

  @Put(':emoji')
  add(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.reactions.add(member, channelId, messageId, emoji);
  }

  @Delete(':emoji')
  remove(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.reactions.remove(member, channelId, messageId, emoji);
  }
}
