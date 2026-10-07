import { Module } from '@nestjs/common';

import { DevicesModule } from '@/components/devices';

import { BrowserChannel } from './browser.channel';
import { ExpoPushClient } from './expo-push.client';
import { NativeAppChannel } from './native-app.channel';
import { NOTIFICATION_CHANNELS } from './notification-channel';
import { NotificationChannelRegistry } from './notification-channel.registry';
import { WebPushClient } from './web-push.client';

// A new way to reach people is one class here; the alert flow picks it up through the registry.
const CHANNELS = [NativeAppChannel, BrowserChannel];

@Module({
  imports: [DevicesModule],
  providers: [
    ExpoPushClient,
    WebPushClient,
    ...CHANNELS,
    { provide: NOTIFICATION_CHANNELS, useFactory: (...channels) => channels, inject: CHANNELS },
    NotificationChannelRegistry,
  ],
  exports: [NotificationChannelRegistry],
})
export class NotificationChannelsModule {}
