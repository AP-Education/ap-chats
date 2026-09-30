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

  // :entryId resolves either a message or a call id — one timeline, one way
  // to fetch a single position from it, regardless of what occupies it.
  @Get(':entryId')
  entry(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.history.entry(member, channelId, entryId);
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
