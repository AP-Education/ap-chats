import { Module } from '@nestjs/common';

import { ConversationAlertsModule } from './alerts/conversation-alerts.module';
import { MessageNotificationContentService } from './alerts/message-notification-content.service';
import { NotificationDeliveryModule } from './delivery/notification-delivery.module';
import { NotificationPreferencesModule } from './preferences';
import { RealtimeNotificationsModule } from './realtime';

@Module({
  imports: [
    NotificationPreferencesModule,
    RealtimeNotificationsModule,
    ConversationAlertsModule,
    NotificationDeliveryModule.register({
      imports: [ConversationAlertsModule],
      content: MessageNotificationContentService,
    }),
  ],
})
export class NotificationsModule {}
