export type NotificationLevel = 'default' | 'all' | 'mentions' | 'none';

export interface NotificationSettings {
  level: NotificationLevel;
  mutedUntil: string | null;
  isMuted: boolean;
}

export type ChangeNotificationSettings =
  | { type: 'level'; level: NotificationLevel }
  | { type: 'mute'; duration: 'hour' | 'day' | 'indefinite' }
  | { type: 'unmute' };

/** What a conversation tells someone about, once its own choice and its workspace's are settled. */
export type ConversationNotify = 'all' | 'mentions' | 'none';

export interface ConversationNotification {
  channelId: string;
  notify: ConversationNotify;
  /** When a snooze behind `none` runs out. */
  mutedUntil: string | null;
}

export interface WorkspaceNotifications {
  /** The workspace's own choice, which its channels follow by default. */
  settings: NotificationSettings;
  conversations: ConversationNotification[];
}
