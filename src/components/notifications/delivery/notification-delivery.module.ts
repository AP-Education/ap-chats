import { type DynamicModule, Module, type ModuleMetadata, type Type } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { AlertDispatcher } from './alert-dispatcher';
import { NotificationChannelsModule } from './channels/notification-channels.module';
import { MessageDeliveryWorker } from './message-delivery.worker';
import { NotificationContent } from './notification-content';
import { DrizzleNotificationWindowsRepository } from './repository/drizzle-notification-windows.repository';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';

/**
 * Everything that reaches a person once they are chosen: throttling, channels and transports.
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
      imports: [DrizzleModule, NotificationChannelsModule, ...(options.imports ?? [])],
      providers: [
        { provide: NotificationContent, useExisting: options.content },
        { provide: NotificationWindowsRepository, useClass: DrizzleNotificationWindowsRepository },
        AlertDispatcher,
        MessageDeliveryWorker,
      ],
    };
  }
}
