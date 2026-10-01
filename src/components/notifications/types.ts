export const notificationLevels = ['default', 'all', 'mentions', 'none'] as const;
export type NotificationLevel = (typeof notificationLevels)[number];

export interface ChannelNotificationSettings {
  level: NotificationLevel;
  mutedUntil: string | null;
  isMuted: boolean;
}

export interface ChangeNotificationSettings {
  type: 'level' | 'mute' | 'unmute';
  level?: NotificationLevel | undefined;
  duration?: 'hour' | 'day' | 'indefinite' | undefined;
}

export interface NotificationSettingsUpdate {
  level: NotificationLevel;
  mutedUntil: Date | null;
  notificationsMuted: boolean;
}

export interface StoredNotificationSettings extends NotificationSettingsUpdate {
  memberId: string;
}

export interface UnreadEntryChange {
  seq: string;
  authorMemberId: string;
}

export interface UnreadMutation {
  workspaceId: string;
  channelId: string;
  kind: 'public' | 'private' | 'dm';
  eventId: string;
  operation: 'append' | 'remove';
  subject: 'message' | 'call';
  entries: UnreadEntryChange[];
  alert: boolean;
}

export type NotificationEventKind =
  'message.created' | 'message.forwarded' | 'message.deleted' | 'call.created';

export interface NotificationSourceEvent {
  workspaceId: string;
  channelId: string;
  eventId: string;
  kind: NotificationEventKind;
  operation: UnreadMutation['operation'];
  actorMemberId: string;
  entries: UnreadEntryChange[];
  messageIds: string[];
}

export interface NotificationDecision {
  kind: NotificationEventKind;
  actorMemberId: string;
  recipientMemberId: string;
  channelKind: UnreadMutation['kind'];
  settings: StoredNotificationSettings;
  mentioned: boolean;
}
