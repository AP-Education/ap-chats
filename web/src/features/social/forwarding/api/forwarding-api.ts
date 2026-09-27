import { apiRequest, jsonInit } from '@/shared/api/http';

import type { Message } from '../../messaging/types';

export function forwardMessages(
  token: string,
  workspaceId: string,
  targetChannelId: string,
  sourceChannelId: string,
  messageIds: string[],
  batchNonce: string,
): Promise<{ messages: Message[] }> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channels/${targetChannelId}/messages/forward`,
    token,
    jsonInit('POST', { sourceChannelId, messageIds, batchNonce }),
  );
}
