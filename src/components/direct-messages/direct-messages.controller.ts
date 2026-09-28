import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
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
export class DirectMessagesController {
  constructor(private readonly directMessages: DirectMessagesService) {}

  @Get()
  list(@CurrentWorkspaceMember() member: WorkspaceMember, @Query('before') before?: string) {
    return this.directMessages.list(member, before);
  }

  @Get('unread')
  unread(@CurrentWorkspaceMember() member: WorkspaceMember) {
    return this.directMessages.unread(member);
  }

  @Post()
  open(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: OpenDirectMessageDto) {
    return this.directMessages.findOrCreate(member, dto.memberId);
  }

  @Get(':channelId')
  get(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.directMessages.get(member, channelId);
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
