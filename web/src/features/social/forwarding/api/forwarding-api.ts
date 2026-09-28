import { apiRequest, jsonInit } from '@/shared/api/http';

import type { DirectMessage } from '../../direct-messages/api/direct-messages-api';
import type { Message } from '../../messaging/types';

export function forwardMessages(
  token: string,
  workspaceId: string,
  target: { kind: 'channel' | 'member'; id: string },
  sourceChannelId: string,
  messageIds: string[],
  batchNonce: string,
): Promise<{ messages: Message[]; conversation: DirectMessage | null }> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/messages/forward`,
    token,
    jsonInit('POST', { target, sourceChannelId, messageIds, batchNonce }),
  );
}
