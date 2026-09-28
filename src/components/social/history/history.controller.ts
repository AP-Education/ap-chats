import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { HistoryQueryDto, HistoryWindowQueryDto } from './dto/history-query.dto';
import { HistoryFacade } from './history.facade';

@Controller('workspaces/:workspaceId/channels/:channelId/messages')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class HistoryController {
  constructor(private readonly history: HistoryFacade) {}

  @Get('window')
  window(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Query() query: HistoryWindowQueryDto,
  ) {
    return this.history.window(member, channelId, query);
  }

  @Get(':messageId')
  message(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.history.message(member, channelId, messageId);
  }

  @Get()
  page(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.history.page(member, channelId, query);
  }
}
