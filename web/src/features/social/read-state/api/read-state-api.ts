import { apiRequest, jsonInit } from '@/shared/api/http';

import type { ReadState } from '../../messaging/types';

export function markRead(
  token: string,
  workspaceId: string,
  channelId: string,
  seq: string,
): Promise<ReadState> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channels/${channelId}/read-state`,
    token,
    jsonInit('PUT', { seq }),
  );
}

/** Unread again from the entry at `seq` on. */
export function markUnread(
  token: string,
  workspaceId: string,
  channelId: string,
  seq: string,
): Promise<ReadState> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channels/${channelId}/read-state/unread`,
    token,
    jsonInit('PUT', { seq }),
  );
}
