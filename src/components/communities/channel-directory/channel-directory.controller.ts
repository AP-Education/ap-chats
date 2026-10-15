import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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

import { ChannelDirectoryService } from './channel-directory.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ListChannelsQueryDto } from './dto/list-channels-query.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Controller('workspaces/:workspaceId/channels')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelDirectoryController {
  constructor(private readonly directory: ChannelDirectoryService) {}

  @Get()
  list(@CurrentWorkspaceMember() member: WorkspaceMember, @Query() query: ListChannelsQueryDto) {
    return this.directory.list(member, query.scope);
  }

  @Post()
  create(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: CreateChannelDto) {
    return this.directory.create(member, dto);
  }

  @Get(':channelId')
  get(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.directory.get(member, channelId);
  }

  @Patch(':channelId')
  update(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.directory.update(member, channelId, dto);
  }

  @Delete(':channelId')
  @HttpCode(204)
  remove(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ): Promise<void> {
    return this.directory.remove(member, channelId);
  }
}
