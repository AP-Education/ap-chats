import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { confirmDirectMessage } from '@/features/social/direct-messages/cache';
import { randomId } from '@/shared/lib/random-id';

import {
  deleteMessages,
  editMessage,
  getMessage,
  historyPage,
  sendMessage,
} from '../api/messages-api';
import { catchUpHistory, mergeHistoryItem } from '../history-cache';
import { messagingQueryKeys } from '../queryKeys';
import type {
  DisplayItem,
  HistoryItem,
  Message,
  MessageAuthor,
  MessageHistoryItem,
  PendingAttachmentCommit,
  SendMessageCommand,
} from '../types';
import { isMessageItem } from '../types';
import { useOutbox } from './useOutbox';
import { useUploadingSends } from './useUploadingSends';

// Matches the `confirmed` keyframe duration in MessageRow.tsx: long enough for
// the "just sent" flash to play before the row settles into a normal message.
const CONFIRMED_FLASH_MS = 900;

function outboxKey(identity: string | undefined, workspaceId: string, channelId: string) {
  return `ap-chats:outbox:${identity}:${workspaceId}:${channelId}`;
}

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
  };
}

function findMessage(messages: readonly MessageHistoryItem[], messageId: string | undefined) {
  return messages.find((item) => item.message.id === messageId);
}

function byCreatedAt(a: DisplayItem, b: DisplayItem) {
  return a.item.createdAt.localeCompare(b.item.createdAt);
}

/**
 * Owns sending. Every message the server hasn't acknowledged lives in the outbox (useOutbox)
 * and shows from there at once, as sending or failed; once history holds it, it is a
 * real message and the outbox lets it go. Sends with attachments still uploading show
 * live until they are ready to enter the outbox (useUploadingSends).
 */
export function useMessageOperations(
  workspaceId: string,
  channelId: string,
  author: MessageAuthor,
  items: HistoryItem[],
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const [confirmedFlash, setConfirmedFlash] = useState<ReadonlySet<string>>(() => new Set());

  const messages = useMemo(() => items.filter(isMessageItem), [items]);
  const delivered = useMemo(
    () =>
      new Set(messages.map((item) => item.message.clientNonce).filter((nonce) => nonce !== null)),
    [messages],
  );
  const outbox = useOutbox(outboxKey(identity, workspaceId, channelId), delivered);

  function flashConfirmed(id: string) {
    setConfirmedFlash((current) => new Set(current).add(id));
    window.setTimeout(() => {
      setConfirmedFlash((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, CONFIRMED_FLASH_MS);
  }

  function refreshHistory() {
    void queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId),
    });
  }

  // Brings an acknowledged message into the loaded history, so its row turns from
  // pending into the real message in place.
  async function mergeSent(sessionToken: string, message: Message) {
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
          queryFn: () => getMessage(sessionToken, workspaceId, channelId, message.id),
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
        (cursor) => historyPage(sessionToken, workspaceId, channelId, 'after', cursor),
      );
      mergeHistoryItem(queryClient, identity, workspaceId, channelId, item);
      flashConfirmed(item.id);
    } catch {
      // Sent, just not locally merged: a full refetch brings it in instead.
      void queryClient.invalidateQueries({ queryKey: historyKey, exact: true });
    }
  }

  async function deliver(input: SendMessageCommand) {
    if (!token) {
      outbox.fail(input.clientNonce);
      return;
    }

    let message: Message;
    try {
      message = await sendMessage(token, workspaceId, channelId, input);
    } catch {
      outbox.fail(input.clientNonce);
      return;
    }

    confirmDirectMessage(queryClient, identity, channelId, message);
    await mergeSent(token, message);
    outbox.settle(input.clientNonce);
  }

  function dispatch(input: SendMessageCommand, createdAt: string) {
    outbox.enqueue(input, createdAt);
    void deliver(input);
  }

  const { uploadingSends, start: startUploadingSend } = useUploadingSends(dispatch);

  function send(
    input: Omit<SendMessageCommand, 'clientNonce' | 'attachments'>,
    pending?: PendingAttachmentCommit,
  ) {
    if (!pending) {
      dispatch({ ...input, clientNonce: randomId() }, new Date().toISOString());
      return;
    }
    startUploadingSend(input, pending);
  }

  function retry(rowId: string) {
    const entry = outbox.unsent.find((candidate) => candidate.input.clientNonce === rowId);
    if (!entry) return;
    dispatch(entry.input, entry.createdAt);
  }

  async function edit(messageId: string, markdown: string, revision?: number) {
    if (!token) throw new Error('Not signed in');
    const result = await editMessage(token, workspaceId, channelId, messageId, markdown, revision);
    refreshHistory();
    return result;
  }

  async function remove(messageIds: string[]) {
    if (!token) throw new Error('Not signed in');
    await deleteMessages(token, workspaceId, channelId, messageIds);
    refreshHistory();
  }

  const displayItems = useMemo<DisplayItem[]>(() => {
    const history: DisplayItem[] = items.map((item) => ({
      item,
      delivery: confirmedFlash.has(item.id) ? 'confirmed' : undefined,
    }));
    const queued: DisplayItem[] = outbox.unsent.map((entry) => ({
      item: synthesize(
        entry.input,
        entry.createdAt,
        author,
        findMessage(messages, entry.input.replyToMessageId),
      ),
      delivery: entry.status,
    }));
    const uploading: DisplayItem[] = [...uploadingSends.entries()].map(([nonce, entry]) => ({
      item: synthesize(
        {
          markdown: entry.markdown,
          clientNonce: nonce,
          replyToMessageId: entry.replyToMessageId,
          quoteText: entry.quoteText,
        },
        entry.createdAt,
        author,
        findMessage(messages, entry.replyToMessageId),
      ),
      delivery: 'uploading',
      pendingAttachments: entry.drafts,
    }));
    // Unsent rows sit below the history, in the order they were written.
    return [...history, ...[...queued, ...uploading].sort(byCreatedAt)];
  }, [items, confirmedFlash, outbox.unsent, uploadingSends, author, messages]);

  return { displayItems, send, retry, edit, remove };
}
