import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CallsService } from './calls.service';

@Controller('workspaces/:workspaceId/calls')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class CallsHistoryController {
  constructor(private readonly calls: CallsService) {}

  @Get()
  list(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query('filter') filter?: string,
    @Query('before') before?: string,
  ) {
    if (filter && filter !== 'all' && filter !== 'missed') {
      throw new BadRequestException('Invalid calls filter');
    }

    return this.calls.list(member, filter === 'missed' ? 'missed' : 'all', before);
  }
}
