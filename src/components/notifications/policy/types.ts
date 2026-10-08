import type { StoredNotificationSettings } from '../preferences/types';
import type { NotificationEventKind } from '../types';

export interface NotificationDecision {
  kind: NotificationEventKind;
  actorMemberId: string;
  recipientMemberId: string;
  settings: StoredNotificationSettings;
  mentioned: boolean;
}
