import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { NotificationRequestsModule } from '../delivery/notification-requests';
import { NotificationPolicyModule } from '../policy';
import { ConversationAlertScheduler } from './conversation-alert.scheduler';
import { MessageNotificationContentService } from './message-notification-content.service';
import { DrizzlePushAudienceRepository } from './repository/drizzle-push-audience.repository';
import { PushAudienceRepository } from './repository/push-audience.repository';

@Module({
  imports: [DrizzleModule, NotificationPolicyModule, NotificationRequestsModule],
  providers: [
    { provide: PushAudienceRepository, useClass: DrizzlePushAudienceRepository },
    MessageNotificationContentService,
    ConversationAlertScheduler,
  ],
  exports: [MessageNotificationContentService],
})
export class ConversationAlertsModule {}
