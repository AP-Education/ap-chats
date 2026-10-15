import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

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
  MessageEdit,
  MessageHistoryItem,
  PendingAttachmentCommit,
  SendMessageCommand,
} from '../types';
import { isMessageItem } from '../types';
import { useOutbox } from './useOutbox';
import { useUploadingSends } from './useUploadingSends';

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

/** A sent message's arrival at the server, which a failed attempt only postpones. */
interface Landing {
  landed: Promise<Message>;
  land: (message: Message) => void;
}

function expectLanding(): Landing {
  let land: (message: Message) => void = () => {};
  const landed = new Promise<Message>((resolve) => {
    land = resolve;
  });
  return { landed, land };
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
  const landings = useRef(new Map<string, Landing>());

  const messages = useMemo(() => items.filter(isMessageItem), [items]);
  const delivered = useMemo(
    () =>
      new Set(messages.map((item) => item.message.clientNonce).filter((nonce) => nonce !== null)),
    [messages],
  );
  const outbox = useOutbox(outboxKey(identity, workspaceId, channelId), delivered);

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

    landings.current.get(input.clientNonce)?.land(message);
    landings.current.delete(input.clientNonce);
    confirmDirectMessage(queryClient, identity, channelId, message);
    await mergeSent(token, message);
    outbox.settle(input.clientNonce);
  }

  function dispatch(input: SendMessageCommand, createdAt: string) {
    outbox.enqueue(input, createdAt);
    void deliver(input);
  }

  const { uploadingSends, start: startUploadingSend } = useUploadingSends(dispatch);

  /** Sends the message; settles once the server has it, however many retries that takes. */
  function send(
    input: Omit<SendMessageCommand, 'clientNonce' | 'attachments'>,
    pending?: PendingAttachmentCommit,
  ): Promise<Message> {
    const clientNonce = pending?.nonce ?? randomId();
    const landing = expectLanding();
    landings.current.set(clientNonce, landing);

    if (pending) startUploadingSend(input, pending);
    else dispatch({ ...input, clientNonce }, new Date().toISOString());
    return landing.landed;
  }

  function retry(rowId: string) {
    const entry = outbox.unsent.find((candidate) => candidate.input.clientNonce === rowId);
    if (!entry) return;
    dispatch(entry.input, entry.createdAt);
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
        { ...entry.input, clientNonce: nonce },
        entry.createdAt,
        author,
        findMessage(messages, entry.input.replyToMessageId),
      ),
      delivery: 'uploading',
      pendingAttachments: entry.drafts,
    }));
    // Unsent rows sit below the history, in the order they were written.
    return [...history, ...[...queued, ...uploading].sort(byCreatedAt)];
  }, [items, outbox.unsent, uploadingSends, author, messages]);

  return { displayItems, send, retry, discard: outbox.discard, edit, remove };
}
