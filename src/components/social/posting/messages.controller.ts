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

import { DeleteMessagesService } from './delete-messages.service';
import { BatchDeleteMessagesDto, EditMessageDto, SendMessageDto } from './dto/send-message.dto';
import { EditMessageService } from './edit-message.service';
import { SendMessageService } from './send-message.service';

@Controller('workspaces/:workspaceId/channels/:channelId/messages')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class MessagesController {
  constructor(
    private readonly sending: SendMessageService,
    private readonly editing: EditMessageService,
    private readonly deleting: DeleteMessagesService,
  ) {}

  @Post()
  send(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.sending.send(member, channelId, dto);
  }

  @Patch(':messageId')
  edit(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.editing.edit(member, channelId, messageId, dto);
  }

  @Delete(':messageId')
  @HttpCode(204)
  async deleteOne(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    await this.deleting.delete(member, channelId, [messageId]);
  }

  @Post('batch-delete')
  batchDelete(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: BatchDeleteMessagesDto,
  ) {
    return this.deleting.delete(member, channelId, dto.messageIds);
  }
}
