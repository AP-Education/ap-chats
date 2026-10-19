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

/** The person's choice for a workspace, and which of their conversations there it leaves silent. */
export interface WorkspaceNotifications {
  /** The workspace's own choice, which its channels follow by default. */
  settings: NotificationSettings;
  /** Conversations that tell the person nothing right now, direct ones included. */
  mutedChannelIds: string[];
  /** When the soonest snooze runs out and what is muted may change; null while none runs. */
  changesAt: string | null;
}

// Mirrors NotificationSettingsRelay on the API: every device of the person takes the new state.
export type NotificationsServerToClientEvents = {
  'notifications:changed': (payload: WorkspaceNotifications & { workspaceId: string }) => void;
};
