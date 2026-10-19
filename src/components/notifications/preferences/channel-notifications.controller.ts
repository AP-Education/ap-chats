import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChangeNotificationSettingsDto, toNotificationChange } from './dto';
import { NotificationSettingsService } from './notification-settings.service';
import type { NotificationSettingsView } from './types';

@Controller('workspaces/:workspaceId/channels/:channelId/notifications')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelNotificationsController {
  constructor(private readonly settings: NotificationSettingsService) {}

  @Get()
  get(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ): Promise<NotificationSettingsView> {
    return this.settings.ofChannel(member, channelId);
  }

  @Patch()
  change(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() command: ChangeNotificationSettingsDto,
  ): Promise<NotificationSettingsView> {
    return this.settings.changeChannel(member, channelId, toNotificationChange(command));
  }
}
