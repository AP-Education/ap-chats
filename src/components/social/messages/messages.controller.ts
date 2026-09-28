import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { BatchDeleteMessagesDto, EditMessageDto, SendMessageDto } from './dto/send-message.dto';
import { MessagesFacade } from './messages.facade';

@Controller('workspaces/:workspaceId/channels/:channelId/messages')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class MessagesController {
  constructor(private readonly messages: MessagesFacade) {}

  @Post()
  send(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.send(member, channelId, dto);
  }

  @Patch(':messageId')
  edit(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messages.edit(member, channelId, messageId, dto);
  }

  @Delete(':messageId')
  @HttpCode(204)
  async deleteOne(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    await this.messages.deleteBatch(member, channelId, { messageIds: [messageId] });
  }

  @Post('batch-delete')
  batchDelete(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: BatchDeleteMessagesDto,
  ) {
    return this.messages.deleteBatch(member, channelId, dto);
  }
}
