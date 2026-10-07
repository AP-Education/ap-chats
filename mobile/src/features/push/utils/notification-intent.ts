export interface NotificationIntent {
  eventId: string;
  userId: string;
  target: Record<string, unknown>;
}

/** A well-formed tap; where its target leads is the page's call, so it is passed on unread. */
export function notificationIntent(value: unknown): NotificationIntent | null {
  if (!value || typeof value !== 'object') return null;

  const { eventId, userId, target } = value as Record<string, unknown>;
  if (typeof eventId !== 'string' || !eventId || typeof userId !== 'string' || !userId) return null;
  if (!target || typeof target !== 'object') return null;

  return { eventId, userId, target: target as Record<string, unknown> };
}
