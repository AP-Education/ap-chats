import type { NotificationIntent } from '../types';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export function notificationIntent(value: unknown): NotificationIntent | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.eventId !== 'string' ||
    !data.eventId ||
    typeof data.userId !== 'string' ||
    !data.userId ||
    typeof data.workspaceId !== 'string' ||
    !uuid.test(data.workspaceId) ||
    typeof data.channelId !== 'string' ||
    !uuid.test(data.channelId) ||
    typeof data.url !== 'string'
  )
    return null;
  const route = `/channels/${data.channelId}?pushWorkspace=${data.workspaceId}`;
  const direct = `/direct/${data.channelId}?pushWorkspace=${data.workspaceId}`;
  if (data.url !== route && data.url !== direct) return null;
  return data as unknown as NotificationIntent;
}
