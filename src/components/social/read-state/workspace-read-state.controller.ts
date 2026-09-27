import { Controller, Get } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ReadStateFacade } from './read-state.facade';

@Controller('workspaces/:workspaceId/read-state')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class WorkspaceReadStateController {
  constructor(private readonly readState: ReadStateFacade) {}

  @Get()
  list(@CurrentWorkspaceMember() member: WorkspaceMember) {
    return this.readState.workspace(member);
  }
}
