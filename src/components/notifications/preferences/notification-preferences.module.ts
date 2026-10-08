import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { WorkspacesModule } from '@/components/workspaces';
import { DrizzleModule } from '@/database/drizzle';

import { NotificationSettingsService } from './notification-settings.service';
import { NotificationsController } from './notifications.controller';
import { DrizzleNotificationSettingsRepository } from './repository/drizzle-notification-settings.repository';
import { NotificationSettingsRepository } from './repository/notification-settings.repository';

@Module({
  imports: [AuthModule, ChannelAccessModule, WorkspacesModule, DrizzleModule],
  controllers: [NotificationsController],
  providers: [
    NotificationSettingsService,
    { provide: NotificationSettingsRepository, useClass: DrizzleNotificationSettingsRepository },
  ],
  exports: [NotificationSettingsService],
})
export class NotificationPreferencesModule {}
