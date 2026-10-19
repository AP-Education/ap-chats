import type { ChangeNotificationSettings, NotificationLevel } from '../../types';

export type MuteDuration = Extract<ChangeNotificationSettings, { type: 'mute' }>['duration'];

/** Compact rows for a popover; finger-sized ones for a dialog or a sheet. */
export type NotificationsMenuSize = 'small' | 'large';

/** A channel's or a workspace's notifications, as the menu reads and changes them. */
export interface NotificationPreference {
  status: 'loading' | 'failed' | 'ready';
  level: NotificationLevel;
  isMuted: boolean;
  changing: boolean;
  retry: () => void;
  chooseLevel: (level: NotificationLevel) => Promise<unknown>;
  chooseMute: (duration: MuteDuration) => Promise<unknown>;
  unmute: () => Promise<unknown>;
}

export interface LevelOption {
  value: NotificationLevel;
  title: string;
  description?: string;
}

/** How the menu speaks of what it silences. */
export interface NotificationsSubject {
  label: string;
  mute: string;
  unmute: string;
  failure: string;
  levels: LevelOption[];
}
