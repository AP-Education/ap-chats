import type { ConversationNotify, WorkspaceNotifications } from './types';

export function notifyByChannel(
  notifications: WorkspaceNotifications,
): ReadonlyMap<string, ConversationNotify> {
  return new Map(
    notifications.conversations.map((conversation) => [
      conversation.channelId,
      conversation.notify,
    ]),
  );
}

/** When the soonest snooze in a workspace runs out, so what it silenced can speak again on time. */
export function nextSnoozeEnd(
  notifications: WorkspaceNotifications | undefined,
  now: number,
): number | null {
  const ends = [
    notifications?.settings.mutedUntil,
    ...(notifications?.conversations.map((conversation) => conversation.mutedUntil) ?? []),
  ]
    .filter((end): end is string => Boolean(end))
    .map((end) => Date.parse(end))
    .filter((end) => end > now);

  return ends.length ? Math.min(...ends) : null;
}
