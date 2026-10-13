import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { NotificationSettingsService } from './notification-settings.service';
import { NotificationsController } from './notifications.controller';
import { DrizzleNotificationSettingsRepository } from './repository/drizzle-notification-settings.repository';
import { NotificationSettingsRepository } from './repository/notification-settings.repository';

@Module({
  imports: [AuthModule, ChannelAccessPolicyModule, WorkspaceMembersModule, DrizzleModule],
  controllers: [NotificationsController],
  providers: [
    NotificationSettingsService,
    { provide: NotificationSettingsRepository, useClass: DrizzleNotificationSettingsRepository },
  ],
  exports: [NotificationSettingsService],
})
export class NotificationPreferencesModule {}
