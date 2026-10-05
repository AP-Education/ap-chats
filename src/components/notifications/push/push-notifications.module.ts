import { Module } from '@nestjs/common';

import { DevicesModule } from '@/components/devices';
import { DrizzleModule } from '@/database/drizzle';

import { NotificationPolicyModule } from '../policy';
import { ConversationNotificationWorker } from './conversation-notification.worker';
import { MessageDeliveryModule } from './delivery';
import { MessageDeliveryWorker } from './message-delivery.worker';
import { MessageNotificationContentService } from './message-notification-content.service';
import { NotificationAudienceModule } from './notification-audience.module';
import { DrizzleNotificationWindowsRepository } from './repository/drizzle-notification-windows.repository';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';

@Module({
  imports: [
    DevicesModule,
    DrizzleModule,
    NotificationPolicyModule,
    NotificationAudienceModule,
    MessageDeliveryModule,
  ],
  providers: [
    MessageNotificationContentService,
    { provide: NotificationWindowsRepository, useClass: DrizzleNotificationWindowsRepository },
    ConversationNotificationWorker,
    MessageDeliveryWorker,
  ],
})
export class PushNotificationsModule {}
