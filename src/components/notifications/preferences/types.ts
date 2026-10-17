import type { ChannelKind } from '@/components/communities/channels/types';

export const notificationLevels = ['default', 'all', 'mentions', 'none'] as const;
export type NotificationLevel = (typeof notificationLevels)[number];

/** What a conversation tells someone about, once its own choice and its workspace's are settled. */
export type ConversationNotify = 'all' | 'mentions' | 'none';

export interface NotificationSettingsView {
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

/** A conversation's own settings, and the workspace's that its channels fall back on. */
export interface ConversationNotificationSettings {
  kind: ChannelKind;
  channel: NotificationSettingsUpdate;
  workspace: NotificationSettingsUpdate;
}

export interface MemberNotificationSettings extends ConversationNotificationSettings {
  memberId: string;
}

export interface ConversationNotification {
  channelId: string;
  notify: ConversationNotify;
  /** When a snooze behind `none` runs out; null while it speaks, or stays muted for good. */
  mutedUntil: string | null;
}

/** The workspace's own choice, and what each of the member's conversations there comes to. */
export interface WorkspaceNotifications {
  settings: NotificationSettingsView;
  conversations: ConversationNotification[];
}
