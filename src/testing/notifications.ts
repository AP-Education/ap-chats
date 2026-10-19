import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { NotificationPolicyService } from '@/components/notifications/policy';
import { NotificationSettingsService } from '@/components/notifications/preferences';
import { DrizzleNotificationSettingsRepository } from '@/components/notifications/preferences/repository/drizzle-notification-settings.repository';

import { RecordedEvents } from './channel-access';
import type { transactionHost } from './pglite';

/** Notification preferences over one embedded database, composed as the app composes them. */
export function notificationServices(host: ReturnType<typeof transactionHost>) {
  const txHost = host as never;
  const events = new RecordedEvents();
  const settings = new NotificationSettingsService(
    new ChannelAccessPolicy(new DrizzleChannelAccessRepository(txHost)),
    new DrizzleNotificationSettingsRepository(txHost),
    new NotificationPolicyService(),
    events,
  );

  return { settings, events };
}
