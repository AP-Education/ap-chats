import { BadRequestException } from '@nestjs/common';

import type {
  ChangeNotificationSettings,
  ConversationNotificationSettings,
  ConversationNotify,
  NotificationSettingsUpdate,
} from './types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Silenced for good, for a while, or by choosing to hear nothing at all. */
export function isMuted(settings: NotificationSettingsUpdate, now = new Date()): boolean {
  return isMutedForGood(settings) || isSnoozed(settings, now);
}

function isMutedForGood(settings: NotificationSettingsUpdate): boolean {
  return settings.notificationsMuted || settings.level === 'none';
}

function isSnoozed(settings: NotificationSettingsUpdate, now: Date): boolean {
  return settings.mutedUntil !== null && settings.mutedUntil > now;
}

/**
 * A channel speaks up for mentions unless someone chooses otherwise, and a muted workspace silences
 * all of its channels. A direct message is meant for you, so it speaks up for every message.
 */
export function conversationNotify(
  { kind, channel, workspace }: ConversationNotificationSettings,
  now = new Date(),
): ConversationNotify {
  const followsWorkspace = kind === 'channel';
  if (isMuted(channel, now) || (followsWorkspace && isMuted(workspace, now))) return 'none';
  if (channel.level === 'all' || channel.level === 'mentions') return channel.level;
  if (!followsWorkspace) return 'all';

  return workspace.level === 'all' ? 'all' : 'mentions';
}

/** When every snooze keeping a conversation quiet has run out; null if nothing but a snooze does. */
export function snoozedUntil(
  { kind, channel, workspace }: ConversationNotificationSettings,
  now = new Date(),
): Date | null {
  const scopes = kind === 'channel' ? [channel, workspace] : [channel];
  if (scopes.some(isMutedForGood)) return null;

  const ends = scopes
    .filter((settings) => isSnoozed(settings, now))
    .map((settings) => settings.mutedUntil!.getTime());
  return ends.length ? new Date(Math.max(...ends)) : null;
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
