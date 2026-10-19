import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { NotificationPolicyModule } from '../policy';
import { ChannelNotificationsController } from './channel-notifications.controller';
import { NotificationSettingsRelay } from './notification-settings.relay';
import { NotificationSettingsService } from './notification-settings.service';
import { DrizzleNotificationSettingsRepository } from './repository/drizzle-notification-settings.repository';
import { NotificationSettingsRepository } from './repository/notification-settings.repository';
import { WorkspaceNotificationsController } from './workspace-notifications.controller';

@Module({
  imports: [
    AuthModule,
    ChannelAccessPolicyModule,
    WorkspaceMembersModule,
    DrizzleModule,
    NotificationPolicyModule,
  ],
  controllers: [ChannelNotificationsController, WorkspaceNotificationsController],
  providers: [
    NotificationSettingsService,
    NotificationSettingsRelay,
    { provide: NotificationSettingsRepository, useClass: DrizzleNotificationSettingsRepository },
  ],
  exports: [NotificationSettingsService],
})
export class NotificationPreferencesModule {}
