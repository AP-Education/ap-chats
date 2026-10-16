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
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChangeScheduledMessageDto, ScheduleMessageDto } from './dto/scheduled-message.dto';
import { ScheduleMessageService } from './schedule-message.service';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { SendScheduledMessageService } from './send-scheduled-message.service';

@Controller('workspaces/:workspaceId/channels/:channelId/scheduled-messages')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ScheduledMessagesController {
  constructor(
    private readonly scheduling: ScheduleMessageService,
    private readonly schedule: ScheduledMessagesService,
    private readonly sending: SendScheduledMessageService,
  ) {}

  @Get()
  list(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.schedule.list(member, channelId);
  }

  @Post()
  create(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: ScheduleMessageDto,
  ) {
    return this.scheduling.schedule(member, channelId, dto);
  }

  @Patch(':scheduledId')
  change(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('scheduledId', ParseUUIDPipe) scheduledId: string,
    @Body() dto: ChangeScheduledMessageDto,
  ) {
    return this.schedule.change(member, channelId, scheduledId, dto);
  }

  @Post(':scheduledId/send')
  sendNow(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('scheduledId', ParseUUIDPipe) scheduledId: string,
  ) {
    return this.sending.sendNow(member, channelId, scheduledId);
  }

  @Delete(':scheduledId')
  @HttpCode(204)
  cancel(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('scheduledId', ParseUUIDPipe) scheduledId: string,
  ) {
    return this.schedule.cancel(member, channelId, scheduledId);
  }
}
