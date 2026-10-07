import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { NotificationPolicyModule } from '../policy';
import { NotificationChannelsModule } from './channels/notification-channels.module';
import { ConversationNotificationWorker } from './conversation-notification.worker';
import { MessageDeliveryWorker } from './message-delivery.worker';
import { MessageNotificationContentService } from './message-notification-content.service';
import { DrizzleNotificationWindowsRepository } from './repository/drizzle-notification-windows.repository';
import { DrizzlePushAudienceRepository } from './repository/drizzle-push-audience.repository';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';
import { PushAudienceRepository } from './repository/push-audience.repository';

@Module({
  imports: [DrizzleModule, NotificationPolicyModule, NotificationChannelsModule],
  providers: [
    { provide: PushAudienceRepository, useClass: DrizzlePushAudienceRepository },
    { provide: NotificationWindowsRepository, useClass: DrizzleNotificationWindowsRepository },
    MessageNotificationContentService,
    ConversationNotificationWorker,
    MessageDeliveryWorker,
  ],
})
export class PushNotificationsModule {}
