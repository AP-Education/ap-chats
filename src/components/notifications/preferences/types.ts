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
