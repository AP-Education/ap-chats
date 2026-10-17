import type { QueryClient } from '@tanstack/react-query';

import { confirmDirectMessage } from '@/features/social/direct-messages/cache';

import { getMessage, historyPage } from '../api/messages-api';
import { catchUpHistory, mergeHistoryItem } from '../history-cache';
import { messagingQueryKeys } from '../queryKeys';
import type { Message, MessageAuthor, MessageHistoryItem } from '../types';

export interface ConversationKey {
  identity: string | undefined;
  workspaceId: string;
  channelId: string;
}

/** Brings an acknowledged message into the loaded history, so its row turns from pending
 * into the real message in place. */
export async function arriveInHistory(
  queryClient: QueryClient,
  { identity, workspaceId, channelId }: ConversationKey,
  token: string,
  message: Message,
  author: MessageAuthor,
) {
  confirmDirectMessage(queryClient, identity, channelId, message);
  const historyKey = messagingQueryKeys.history(identity, workspaceId, channelId);
  try {
    let item: MessageHistoryItem;
    try {
      item = await queryClient.fetchQuery({
        queryKey: [
          ...messagingQueryKeys.channel(identity, workspaceId, channelId),
          'item',
          message.id,
        ],
        queryFn: () => getMessage(token, workspaceId, channelId, message.id),
        staleTime: 30_000,
      });
    } catch {
      item = {
        type: 'MESSAGE',
        id: message.id,
        seq: message.seq,
        createdAt: message.createdAt,
        message,
        author,
        reply: null,
        forwardedFrom: null,
        pin: null,
      };
    }
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
    // Sent, just not locally merged: a full refetch brings it in instead.
    void queryClient.invalidateQueries({ queryKey: historyKey, exact: true });
  }
}
