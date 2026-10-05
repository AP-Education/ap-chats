import { Module } from '@nestjs/common';

import { NotificationPreferencesModule } from './preferences';
import { PushNotificationsModule } from './push';
import { RealtimeNotificationsModule } from './realtime';

@Module({
  imports: [NotificationPreferencesModule, RealtimeNotificationsModule, PushNotificationsModule],
})
export class NotificationsModule {}
