import { removeEntries, replaceEntry } from '@ap-education/timeline';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { deleteMessages, editMessage, getEntry } from '../api/messages-api';
import { messagingQueryKeys } from '../queryKeys';
import { useConversationOutbox } from '../sending/hooks/useConversationOutbox';
import { unsentRows } from '../sending/utils/unsent-rows';
import { type ChatTimelineData, toEntry } from '../timeline/chat-entry';
import type { ComposedMessage, HistoryItem, Message, MessageAuthor, MessageEdit } from '../types';
import { isMessageItem } from '../types';

/** The conversation's unsent messages for below its history, and the ways to change both. */
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

  // Only the changed messages are read again, so the older pages already scrolled through stay.
  async function refreshMessages(messageIds: string[]) {
    if (!token) return;

    const histories = messagingQueryKeys.histories(identity, workspaceId, channelId);
    for (const messageId of messageIds) {
      const item = await getEntry(token, workspaceId, channelId, messageId).catch(() => null);
      queryClient.setQueriesData<ChatTimelineData>({ queryKey: histories }, (history) => {
        if (!history) return history;
        return item ? replaceEntry(history, toEntry(item)) : removeEntries(history, [messageId]);
      });
    }
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
    await refreshMessages([messageId]);
    return result;
  }

  async function remove(messageIds: string[]) {
    if (!token) throw new Error('Not signed in');
    await deleteMessages(token, workspaceId, channelId, messageIds);
    await refreshMessages(messageIds);
  }

  const pending = useMemo(
    () => unsentRows(snapshot, delivered, author, messages),
    [snapshot, delivered, author, messages],
  );

  return { pending, send, unsent: actions, edit, remove };
}
