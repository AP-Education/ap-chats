import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { deleteMessages, editMessage } from '../api/messages-api';
import { messagingQueryKeys } from '../queryKeys';
import { useConversationOutbox } from '../sending/hooks/useConversationOutbox';
import { unsentRows } from '../sending/utils/unsent-rows';
import type {
  ComposedMessage,
  DisplayItem,
  HistoryItem,
  Message,
  MessageAuthor,
  MessageEdit,
} from '../types';
import { isMessageItem } from '../types';

/** The conversation's history with its unsent messages below it, and the ways to change both. */
export function useMessageOperations(
  workspaceId: string,
  channelId: string,
  author: MessageAuthor,
  items: HistoryItem[],
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const messages = useMemo(() => items.filter(isMessageItem), [items]);
  const delivered = useMemo(
    () =>
      new Set(messages.map((item) => item.message.clientNonce).filter((nonce) => nonce !== null)),
    [messages],
  );
  const { outbox, snapshot, actions } = useConversationOutbox(workspaceId, channelId, delivered);

  function refreshHistory() {
    void queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId),
    });
  }

  function send(input: ComposedMessage, nonce: string): Promise<Message> {
    return outbox.send(input, nonce);
  }

  async function edit(messageId: string, change: MessageEdit, revision?: number) {
    if (!token) throw new Error('Not signed in');
    const result = await editMessage(token, workspaceId, channelId, messageId, {
      ...change,
      revision,
    });
    refreshHistory();
    return result;
  }

  async function remove(messageIds: string[]) {
    if (!token) throw new Error('Not signed in');
    await deleteMessages(token, workspaceId, channelId, messageIds);
    refreshHistory();
  }

  const displayItems = useMemo<DisplayItem[]>(
    () => [
      ...items.map((item) => ({ item, delivery: undefined })),
      ...unsentRows(snapshot, delivered, author, messages),
    ],
    [items, snapshot, delivered, author, messages],
  );

  return { displayItems, send, unsent: actions, edit, remove };
}
