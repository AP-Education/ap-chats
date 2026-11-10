import { Controller, Get, Query } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ConversationSearchQuery } from './conversation-search.dto';
import { ConversationSearchService } from './conversation-search.service';

@Controller('workspaces/:workspaceId/search')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ConversationSearchController {
  constructor(private readonly search: ConversationSearchService) {}

  @Get()
  find(@CurrentWorkspaceMember() member: WorkspaceMember, @Query() query: ConversationSearchQuery) {
    return this.search.search(member, query.q);
  }
}
