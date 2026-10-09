import { Body, Controller, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { IsIn, IsUUID } from 'class-validator';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { DirectMessagesService } from './direct-messages.service';

class OpenDirectMessageDto {
  @IsUUID()
  memberId!: string;
}

class UpdateDirectMessageMuteDto {
  @IsIn(['unmute', 'hour', 'day', 'indefinite'])
  mode!: 'unmute' | 'hour' | 'day' | 'indefinite';
}

@Controller('workspaces/:workspaceId/direct-messages')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class WorkspaceDirectMessagesController {
  constructor(private readonly directMessages: DirectMessagesService) {}

  @Post()
  open(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: OpenDirectMessageDto) {
    return this.directMessages.open(member, dto.memberId);
  }

  @Patch(':channelId/mute')
  updateMute(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: UpdateDirectMessageMuteDto,
  ) {
    return this.directMessages.updateMute(member, channelId, dto.mode);
  }
}
