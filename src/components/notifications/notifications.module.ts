import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { ChannelAudienceModule } from '@/components/communities/channel-audience/channel-audience.module';
import { ChannelsRepositoryModule } from '@/components/communities/channels/channels-repository.module';
import { MentionsModule } from '@/components/social/mentions/mentions.module';
import { WorkspacesModule } from '@/components/workspaces';
import { DrizzleModule } from '@/database/drizzle';
import { RealtimeTransportModule } from '@/globals/realtime';

import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationEventsHandler } from './notification-events.handler';
import { NotificationPolicyService } from './notification-policy.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationsController } from './notifications.controller';
import { DrizzleNotificationSettingsRepository } from './repository/drizzle-notification-settings.repository';
import { NotificationSettingsRepository } from './repository/notification-settings.repository';

@Module({
  imports: [
    AuthModule,
    ChannelAccessModule,
    ChannelAudienceModule,
    ChannelsRepositoryModule,
    DrizzleModule,
    MentionsModule,
    RealtimeTransportModule,
    WorkspacesModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationDeliveryService,
    NotificationEventsHandler,
    NotificationPolicyService,
    NotificationSettingsService,
    { provide: NotificationSettingsRepository, useClass: DrizzleNotificationSettingsRepository },
  ],
})
export class NotificationsModule {}
