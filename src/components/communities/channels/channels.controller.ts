import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Controller('workspaces/:workspaceId/channels')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Get()
  list(@CurrentWorkspaceMember() member: WorkspaceMember, @Query('scope') scope?: string) {
    if (scope && scope !== 'available' && scope !== 'joined')
      throw new BadRequestException('Invalid channel scope');
    return this.channels.list(member, scope === 'joined' ? 'joined' : 'available');
  }

  @Post()
  create(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: CreateChannelDto) {
    return this.channels.create(member, dto);
  }

  @Get(':channelId')
  get(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channels.get(member, channelId);
  }

  @Patch(':channelId')
  update(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channels.update(member, channelId, dto);
  }

  @Post(':channelId/archive')
  archive(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channels.setArchived(member, channelId, true);
  }

  @Post(':channelId/unarchive')
  unarchive(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channels.setArchived(member, channelId, false);
  }
}
