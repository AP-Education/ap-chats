import { Module } from '@nestjs/common';

import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { ChannelsRepositoryModule } from '@/components/communities/channels';
import { MentionsModule } from '@/components/social/mentions';
import { RealtimeTransportModule } from '@/globals/realtime';

import { NotificationPolicyModule } from '../policy';
import { NotificationPreferencesModule } from '../preferences';
import { RealtimeNotificationDeliveryService } from './realtime-notification-delivery.service';
import { RealtimeNotificationEventsHandler } from './realtime-notification-events.handler';

@Module({
  imports: [
    ChannelAudienceModule,
    ChannelsRepositoryModule,
    MentionsModule,
    RealtimeTransportModule,
    NotificationPolicyModule,
    NotificationPreferencesModule,
  ],
  providers: [RealtimeNotificationDeliveryService, RealtimeNotificationEventsHandler],
})
export class RealtimeNotificationsModule {}
