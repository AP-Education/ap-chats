import { Body, Controller, Get, Patch } from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChangeNotificationSettingsDto } from './dto';
import { NotificationSettingsService } from './notification-settings.service';
import type { WorkspaceNotifications } from './types';

@Controller('workspaces/:workspaceId/notifications')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class WorkspaceNotificationsController {
  constructor(private readonly settings: NotificationSettingsService) {}

  @Get()
  get(@CurrentWorkspaceMember() member: WorkspaceMember): Promise<WorkspaceNotifications> {
    return this.settings.forWorkspace(member);
  }

  @Patch()
  change(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() command: ChangeNotificationSettingsDto,
  ): Promise<WorkspaceNotifications> {
    return this.settings.changeForWorkspace(member, command);
  }
}
