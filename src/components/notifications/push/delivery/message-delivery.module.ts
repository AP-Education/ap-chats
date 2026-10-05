import { Module } from '@nestjs/common';

import { DevicesModule } from '@/components/devices';

import { ExpoPushProvider } from '../provider/expo-push.provider';
import { ExpoServerPushProvider } from '../provider/expo-server-push.provider';
import { VapidWebPushProvider } from '../provider/vapid-web-push.provider';
import { WebPushProvider } from '../provider/web-push.provider';
import { BrowserMessageDelivery } from './browser-message-delivery';
import { MessageDeliveryRegistry } from './message-delivery.registry';
import { NativeMessageDelivery } from './native-message-delivery';

@Module({
  imports: [DevicesModule],
  providers: [
    { provide: ExpoPushProvider, useClass: ExpoServerPushProvider },
    { provide: WebPushProvider, useClass: VapidWebPushProvider },
    NativeMessageDelivery,
    BrowserMessageDelivery,
    MessageDeliveryRegistry,
  ],
  exports: [MessageDeliveryRegistry],
})
export class MessageDeliveryModule {}
