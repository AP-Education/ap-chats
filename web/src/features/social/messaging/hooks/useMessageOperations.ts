import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { randomId } from '@/shared/lib/random-id';

import { deleteMessages, editMessage } from '../api/messages-api';
import { messagingQueryKeys } from '../queryKeys';
import { unsent } from '../sending/outbox';
import { useConversationSending } from '../sending/outboxes-context';
import type {
  ComposedMessage,
  DisplayItem,
  HistoryItem,
  Message,
  MessageAuthor,
  MessageEdit,
  MessageHistoryItem,
  SendMessageCommand,
} from '../types';
import { isMessageItem } from '../types';
import type { UnsentMessages } from '../unsent-messages-context';

// An unsent row goes by its nonce until the server gives the message an id.
function synthesize(
  input: SendMessageCommand,
  createdAt: string,
  author: MessageAuthor,
  replyTarget: MessageHistoryItem | undefined,
): MessageHistoryItem {
  return {
    type: 'MESSAGE',
    id: input.clientNonce,
    seq: '0',
    createdAt,
    message: {
      id: input.clientNonce,
      seq: '0',
      authorMemberId: author.memberId,
      clientNonce: input.clientNonce,
      markdown: input.markdown,
      attachments: input.attachments ?? [],
      blocks: input.blocks ?? [],
      contentVersion: 1,
      revision: 1,
      replyToMessageId: input.replyToMessageId ?? null,
      quoteText: input.quoteText ?? null,
      isForwarded: false,
      forwardedFromMemberId: null,
      createdAt,
      editedAt: null,
      deletedAt: null,
    },
    author,
    reply: replyTarget
      ? {
          id: replyTarget.message.id,
          authorMemberId: replyTarget.message.authorMemberId,
          author: replyTarget.author,
          markdown: replyTarget.message.markdown,
        }
      : null,
    forwardedFrom: null,
    pin: null,
    // Named from the composer's own labels so the row reads the same before and after history has it.
    mentions: Object.entries(input.labels ?? {}).map(([memberId, displayName]) => ({
      memberId,
      displayName,
      avatarPath: null,
      isBot: false,
    })),
  };
}

function findMessage(messages: readonly MessageHistoryItem[], messageId: string | undefined) {
  return messages.find((item) => item.message.id === messageId);
}

function byCreatedAt(a: DisplayItem, b: DisplayItem) {
  return a.item.createdAt.localeCompare(b.item.createdAt);
}

/**
 * The conversation's history merged with its unsent messages, and the ways to change both.
 * Sending belongs to the conversation's outbox (ConversationOutbox), which outlives this
 * screen: every message the server hasn't acknowledged shows from there at once, as
 * uploading, sending or failed, and once history holds it, it is a real message.
 */
export function useMessageOperations(
  workspaceId: string,
  channelId: string,
  author: MessageAuthor,
  items: HistoryItem[],
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { outbox } = useConversationSending(workspaceId, channelId);
  const unsentMessages = useSyncExternalStore(outbox.subscribe, outbox.getSnapshot);

  const messages = useMemo(() => items.filter(isMessageItem), [items]);
  const delivered = useMemo(
    () =>
      new Set(messages.map((item) => item.message.clientNonce).filter((nonce) => nonce !== null)),
    [messages],
  );
  useEffect(() => outbox.forget(delivered), [outbox, delivered]);

  function refreshHistory() {
    void queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId),
    });
  }

  function send(input: ComposedMessage, filesNonce?: string): Promise<Message> {
    return outbox.send(input, author, filesNonce ?? randomId(), Boolean(filesNonce));
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

  const displayItems = useMemo<DisplayItem[]>(() => {
    const history: DisplayItem[] = items.map((item) => ({ item, delivery: undefined }));
    // History is the truth: an entry it already holds waits only for forget() to drop it.
    const pending: DisplayItem[] = unsent(unsentMessages.entries, delivered).map((entry) => ({
      item: synthesize(
        entry.input,
        entry.createdAt,
        author,
        findMessage(messages, entry.input.replyToMessageId),
      ),
      delivery: entry.status,
      pendingAttachments: unsentMessages.files.get(entry.input.clientNonce),
    }));
    // Unsent rows sit below the history, in the order they were written.
    return [...history, ...pending.sort(byCreatedAt)];
  }, [items, unsentMessages, delivered, author, messages]);

  // Stable, so rows that read them from context skip renders their own entry didn't cause.
  const unsentActions = useMemo<UnsentMessages>(
    () => ({
      retry: (nonce) => outbox.retry(nonce, author),
      discard: (nonce) => outbox.cancel(nonce),
      discardFile: (nonce, key) => outbox.cancelFile(nonce, key),
    }),
    [outbox, author],
  );

  return { displayItems, send, unsent: unsentActions, edit, remove };
}
