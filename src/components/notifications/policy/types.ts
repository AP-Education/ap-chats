import type { StoredNotificationSettings } from '../preferences/types';

export type NotificationEventKind =
  'message.created' | 'message.forwarded' | 'message.deleted' | 'call.created';

export interface NotificationDecision {
  kind: NotificationEventKind;
  actorMemberId: string;
  recipientMemberId: string;
  settings: StoredNotificationSettings;
  mentioned: boolean;
}
