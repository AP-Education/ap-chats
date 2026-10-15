import { Body, Controller, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { DirectConversationsService } from './direct-conversations.service';
import { OpenDirectMessageDto, UpdateDirectMessageMuteDto } from './dto/direct-conversation.dto';

@Controller('workspaces/:workspaceId/direct-messages')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class WorkspaceDirectMessagesController {
  constructor(private readonly conversations: DirectConversationsService) {}

  @Post()
  open(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: OpenDirectMessageDto) {
    return this.conversations.open(member, dto.memberId);
  }

  @Patch(':channelId/mute')
  updateMute(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: UpdateDirectMessageMuteDto,
  ) {
    return this.conversations.mute(member, channelId, dto.mode);
  }
}
