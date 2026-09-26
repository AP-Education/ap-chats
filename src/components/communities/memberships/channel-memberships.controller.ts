import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelMembershipsService } from './channel-memberships.service';
import { AddChannelMemberDto } from './dto/add-channel-member.dto';

@Controller('workspaces/:workspaceId/channels/:channelId')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelMembershipsController {
  constructor(private readonly memberships: ChannelMembershipsService) {}

  @Get('members')
  list(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.memberships.list(member, channelId);
  }

  @Post('join')
  join(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.memberships.join(member, channelId);
  }

  @Post('members')
  add(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: AddChannelMemberDto,
  ) {
    return this.memberships.add(member, channelId, dto.memberId);
  }

  @Delete('members/me')
  @HttpCode(204)
  leave(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ): Promise<void> {
    return this.memberships.remove(member, channelId);
  }

  @Delete('members/:memberId')
  @HttpCode(204)
  remove(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    return this.memberships.remove(member, channelId, memberId);
  }
}
