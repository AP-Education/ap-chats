import { BadRequestException } from '@nestjs/common';

import type { ChangeNotificationSettings, NotificationSettingsUpdate } from './types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Silenced for good, for a while, or by choosing to hear nothing at all. */
export function isMuted(settings: NotificationSettingsUpdate, now = new Date()): boolean {
  const isSnoozed = settings.mutedUntil !== null && settings.mutedUntil > now;
  return settings.notificationsMuted || settings.level === 'none' || isSnoozed;
}

// Muting and unmuting lift a 'none' level back to the default, so unmuting always means sound.
export function settingsAfter(
  current: NotificationSettingsUpdate,
  command: ChangeNotificationSettings,
): NotificationSettingsUpdate {
  const audibleLevel = current.level === 'none' ? 'default' : current.level;

  switch (command.type) {
    case 'level':
      if (!command.level) throw new BadRequestException('Notification level is required');
      return { level: command.level, notificationsMuted: false, mutedUntil: null };
    case 'mute':
      if (!command.duration) throw new BadRequestException('Mute duration is required');
      if (command.duration === 'indefinite')
        return { level: audibleLevel, notificationsMuted: true, mutedUntil: null };
      return {
        level: audibleLevel,
        notificationsMuted: false,
        mutedUntil: new Date(Date.now() + (command.duration === 'hour' ? HOUR_MS : DAY_MS)),
      };
    case 'unmute':
      return { level: audibleLevel, notificationsMuted: false, mutedUntil: null };
  }
}
