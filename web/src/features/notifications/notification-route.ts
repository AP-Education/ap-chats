const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface NotificationRoute {
  workspaceId: string;
  path: string;
}

/** Where a tapped notification leads in this app; anything unknown or malformed leads nowhere. */
export function notificationRoute(target: unknown): NotificationRoute | null {
  if (!target || typeof target !== 'object') return null;

  const { type, workspaceId, channelId, kind } = target as Record<string, unknown>;
  if (type !== 'conversation' || !isUuid(workspaceId) || !isUuid(channelId)) return null;
  if (kind !== 'dm' && kind !== 'channel') return null;

  return { workspaceId, path: `/${kind === 'dm' ? 'direct' : 'channels'}/${channelId}` };
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuid.test(value);
}
