import { type DynamicModule, Module, type ModuleMetadata, type Type } from '@nestjs/common';

import { AttentionModule } from '@/components/attention';

import { AlertDispatcher } from './alert-dispatcher';
import { NotificationChannelsModule } from './channels/notification-channels.module';
import { DeliveryWorker } from './delivery.worker';
import { NotificationContent } from './notification-content';

/**
 * Everything that reaches a person once they are chosen: channels and transports.
 * It reads no chat data; the conversation's owner plugs in `NotificationContent`.
 */
@Module({})
export class NotificationDeliveryModule {
  static register(options: {
    imports: ModuleMetadata['imports'];
    content: Type<NotificationContent>;
  }): DynamicModule {
    return {
      module: NotificationDeliveryModule,
      imports: [NotificationChannelsModule, AttentionModule, ...(options.imports ?? [])],
      providers: [
        { provide: NotificationContent, useExisting: options.content },
        AlertDispatcher,
        DeliveryWorker,
      ],
    };
  }
}
