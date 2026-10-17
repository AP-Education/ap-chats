import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { NotificationSettingsService } from '@/components/notifications/preferences';
import { DrizzleNotificationSettingsRepository } from '@/components/notifications/preferences/repository/drizzle-notification-settings.repository';

import type { transactionHost } from './pglite';

/** Notification preferences over one embedded database, composed as the app composes them. */
export function notificationServices(host: ReturnType<typeof transactionHost>) {
  const txHost = host as never;
  const settings = new NotificationSettingsService(
    new ChannelAccessPolicy(new DrizzleChannelAccessRepository(txHost)),
    new DrizzleNotificationSettingsRepository(txHost),
  );

  return { settings };
}
