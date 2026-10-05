import type { ChannelKind } from '@/components/communities/channels';

import type { StoredNotificationSettings } from '../preferences/types';
import type { NotificationEventKind } from '../types';

export interface NotificationDecision {
  kind: NotificationEventKind;
  actorMemberId: string;
  recipientMemberId: string;
  channelKind: ChannelKind;
  settings: StoredNotificationSettings;
  mentioned: boolean;
}
