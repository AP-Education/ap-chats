import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ReactionDto, ReactorsQueryDto } from './dto/reaction.dto';
import { ReactionsFacade } from './reactions.facade';

@Controller('workspaces/:workspaceId/channels/:channelId/messages/:messageId/reactions')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ReactionsController {
  constructor(private readonly reactions: ReactionsFacade) {}

  @Get()
  whoReacted(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query() query: ReactorsQueryDto,
  ) {
    return this.reactions.whoReacted(member, channelId, messageId, query.emoji);
  }

  @Post()
  @HttpCode(200)
  react(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.reactions.react(member, channelId, messageId, dto.emoji);
  }

  @Delete()
  withdraw(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query() dto: ReactionDto,
  ) {
    return this.reactions.withdraw(member, channelId, messageId, dto.emoji);
  }
}
