import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { MentionsFacade } from './mentions.facade';

@Controller('workspaces/:workspaceId')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class MentionsController {
  constructor(private readonly mentions: MentionsFacade) {}

  @Get('channels/:channelId/mention-candidates')
  candidates(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Query('q') query = '',
  ) {
    return this.mentions.candidates(member, channelId, query);
  }
}
