import type { ChannelKind } from '@/components/communities/channels/types';

export const notificationLevels = ['default', 'all', 'mentions', 'none'] as const;
export type NotificationLevel = (typeof notificationLevels)[number];

export const muteDurations = ['hour', 'day', 'indefinite'] as const;
export type MuteDuration = (typeof muteDurations)[number];

/** What a conversation tells someone about, once its own choice and its workspace's are settled. */
export type ConversationNotify = 'all' | 'mentions' | 'none';

export interface NotificationSettingsView {
  level: NotificationLevel;
  mutedUntil: string | null;
  isMuted: boolean;
}

export type ChangeNotificationSettings =
  | { type: 'level'; level: NotificationLevel }
  | { type: 'mute'; duration: MuteDuration }
  | { type: 'unmute' };

export interface NotificationSettingsUpdate {
  level: NotificationLevel;
  mutedUntil: Date | null;
  notificationsMuted: boolean;
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

/** The member's choice for a workspace, and which of their conversations there it leaves silent. */
export interface WorkspaceNotifications {
  settings: NotificationSettingsView;
  /** Conversations that tell the member nothing right now, direct ones included. */
  mutedChannelIds: string[];
  /** When the soonest snooze runs out and what is muted may change; null while none runs. */
  changesAt: string | null;
}
