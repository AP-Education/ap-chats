import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChangeNotificationSettingsDto } from './dto/change-notification-settings.dto';
import { NotificationSettingsService } from './notification-settings.service';
import type { ChannelNotificationSettings } from './types';

@Controller('workspaces/:workspaceId/channels/:channelId/notifications')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class NotificationsController {
  constructor(private readonly settings: NotificationSettingsService) {}

  @Get()
  get(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ): Promise<ChannelNotificationSettings> {
    return this.settings.get(member, channelId);
  }

  @Patch()
  change(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() command: ChangeNotificationSettingsDto,
  ): Promise<ChannelNotificationSettings> {
    return this.settings.change(member, channelId, command);
  }
}
