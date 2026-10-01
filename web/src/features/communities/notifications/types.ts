export type NotificationLevel = 'default' | 'all' | 'mentions' | 'none';

export interface ChannelNotificationSettings {
  level: NotificationLevel;
  mutedUntil: string | null;
  isMuted: boolean;
}

export type ChangeNotificationSettings =
  | { type: 'level'; level: NotificationLevel }
  | { type: 'mute'; duration: 'hour' | 'day' | 'indefinite' }
  | { type: 'unmute' };
