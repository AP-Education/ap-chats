import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { MarkReadDto } from './dto/mark-read.dto';
import { ReadStateFacade } from './read-state.facade';

@Controller('workspaces/:workspaceId/channels/:channelId/read-state')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ReadStateController {
  constructor(private readonly readState: ReadStateFacade) {}

  @Get()
  getState(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.readState.getState(member, channelId);
  }

  @Put()
  markRead(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.readState.markRead(member, channelId, dto.seq);
  }
}
