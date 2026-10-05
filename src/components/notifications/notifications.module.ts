import { Module } from '@nestjs/common';

import { NotificationPreferencesModule } from './preferences';
import { RealtimeNotificationsModule } from './realtime';

@Module({
  imports: [NotificationPreferencesModule, RealtimeNotificationsModule],
})
export class NotificationsModule {}
