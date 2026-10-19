import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { DirectConversationsService } from '@/components/direct-messages/conversations';
import { DrizzleDirectConversationsRepository } from '@/components/direct-messages/conversations/repository/drizzle-direct-conversations.repository';
import { DirectInboxService } from '@/components/direct-messages/inbox';
import { DrizzleDirectInboxRepository } from '@/components/direct-messages/inbox/repository/drizzle-direct-inbox.repository';
import { NotificationPolicyService } from '@/components/notifications/policy';
import { NotificationSettingsService } from '@/components/notifications/preferences';
import { DrizzleNotificationSettingsRepository } from '@/components/notifications/preferences/repository/drizzle-notification-settings.repository';

import { RecordedEvents } from './channel-access';
import type { transactionHost } from './pglite';

/** Direct messages over one embedded database, composed as the app composes them. */
export function directMessageServices(
  host: ReturnType<typeof transactionHost>,
  access = new ChannelAccessPolicy(new DrizzleChannelAccessRepository(host as never)),
) {
  const txHost = host as never;
  const policy = new NotificationPolicyService();
  const inbox = new DirectInboxService(new DrizzleDirectInboxRepository(txHost), policy);
  const settings = new NotificationSettingsService(
    access,
    new DrizzleNotificationSettingsRepository(txHost),
    policy,
    new RecordedEvents(),
  );
  const conversations = new DirectConversationsService(
    new DrizzleDirectConversationsRepository(txHost),
    inbox,
    settings,
  );

  return { inbox, conversations };
}
