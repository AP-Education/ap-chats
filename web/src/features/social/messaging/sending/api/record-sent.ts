import type { QueryClient } from '@tanstack/react-query';

import { confirmDirectMessage } from '@/features/social/direct-messages/cache';

import { getMessage, historyPage } from '../../api/messages-api';
import { catchUpHistory, mergeHistoryItem } from '../../history-cache';
import { messagingQueryKeys } from '../../queryKeys';
import type { Message } from '../../types';
import type { ConversationKey } from '../types';

// Lands before the outbox lets the message go, so its row turns into the real one in place.
export async function recordSentMessage(
  queryClient: QueryClient,
  { identity, workspaceId, channelId }: ConversationKey,
  token: string,
  message: Message,
) {
  confirmDirectMessage(queryClient, identity, channelId, message);
  const historyKey = messagingQueryKeys.history(identity, workspaceId, channelId);

  try {
    const item = await queryClient.fetchQuery({
      queryKey: [
        ...messagingQueryKeys.channel(identity, workspaceId, channelId),
        'item',
        message.id,
      ],
      queryFn: () => getMessage(token, workspaceId, channelId, message.id),
      staleTime: 30_000,
    });
    await catchUpHistory(
      queryClient,
      identity,
      workspaceId,
      channelId,
      historyKey,
      item.seq,
      (cursor) => historyPage(token, workspaceId, channelId, 'after', cursor),
    );
    mergeHistoryItem(queryClient, identity, workspaceId, channelId, item);
  } catch {
    await queryClient.invalidateQueries({ queryKey: historyKey, exact: true });
  }
}
