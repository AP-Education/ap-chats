import { Body, Controller, Post } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ForwardMessagesDto } from './dto/forward-messages.dto';
import { ForwardingFacade } from './forwarding.facade';

@Controller('workspaces/:workspaceId/messages/forward')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ForwardingController {
  constructor(private readonly forwarding: ForwardingFacade) {}

  @Post()
  forward(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: ForwardMessagesDto) {
    return this.forwarding.forward(member, dto);
  }
}
