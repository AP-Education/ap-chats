import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useOptimistic, useState, useTransition } from 'react';

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
import type { HistoryItem, MessageAuthor, MessageHistoryItem, SendMessageCommand } from '../types';
import { isMessageItem } from '../types';

export type DeliveryStatus = 'sending' | 'failed' | 'confirmed';

export interface DisplayItem {
  item: HistoryItem;
  delivery: DeliveryStatus | undefined;
  nonce: string | null;
}

// Reload-survival only: a send whose outcome the current session doesn't yet
// know. 'sending' is written the moment a send starts, before any await, so a
// tab closed mid-request still has something to retry; it plays no part in the
// live-session display, which the optimistic bubble already covers.
interface PendingSend {
  input: SendMessageCommand;
  createdAt: string;
  status: 'sending' | 'failed';
}

// Matches the `confirmed` keyframe duration in MessageRow.tsx: long enough for
// the "just sent" flash to play before the row settles into a normal message.
const CONFIRMED_FLASH_MS = 900;

function outboxKey(identity: string | undefined, workspaceId: string, channelId: string) {
  return `ap-chats:outbox:${identity}:${workspaceId}:${channelId}`;
}

function readPendingSends(key: string): PendingSend[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return (
      stored
        .filter((item): item is PendingSend => {
          if (typeof item !== 'object' || item === null) return false;
          const candidate = item as Partial<PendingSend>;
          return (
            typeof candidate.input?.markdown === 'string' &&
            typeof candidate.input?.clientNonce === 'string' &&
            typeof candidate.createdAt === 'string'
          );
        })
        // Whatever was still 'sending' when the tab closed has an unknown
        // outcome now: treat it the same as a failure, safe to retry (the
        // server dedupes by clientNonce if it actually went through).
        .map((item) => ({ ...item, status: 'failed' as const }))
    );
  } catch {
    return [];
  }
}

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

/**
 * Owns sending: an optimistic bubble shows immediately and quietly becomes the
 * real message once the server confirms it (React drops the optimistic overlay
 * on its own once `items` includes it — no polling, no manual bookkeeping to
 * take it back out). A send that never reaches the server persists across
 * reloads so it can be retried.
 */
export function useMessageOperations(
  workspaceId: string,
  channelId: string,
  author: MessageAuthor,
  items: HistoryItem[],
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const key = outboxKey(identity, workspaceId, channelId);
  const [pendingSends, setPendingSends] = useState(() => readPendingSends(key));
  const [confirmedFlash, setConfirmedFlash] = useState<ReadonlySet<string>>(() => new Set());

  const messages = useMemo(() => items.filter(isMessageItem), [items]);
  const confirmedNonces = useMemo(
    () =>
      new Set(messages.map((item) => item.message.clientNonce).filter((nonce) => nonce !== null)),
    [messages],
  );

  const [optimisticItems, addOptimisticItem] = useOptimistic<HistoryItem[], MessageHistoryItem>(
    items,
    (state, incoming) =>
      state.some(
        (item) => isMessageItem(item) && item.message.clientNonce === incoming.message.clientNonce,
      )
        ? state
        : [...state, incoming],
  );

  function persistPending(updater: (current: PendingSend[]) => PendingSend[]) {
    setPendingSends((current) => {
      const next = updater(current);
      if (next.length) localStorage.setItem(key, JSON.stringify(next));
      else localStorage.removeItem(key);
      return next;
    });
  }

  function markSending(input: SendMessageCommand, createdAt: string) {
    persistPending((current) => [
      ...current.filter((entry) => entry.input.clientNonce !== input.clientNonce),
      { input, createdAt, status: 'sending' },
    ]);
  }

  function markFailed(nonce: string) {
    persistPending((current) =>
      current.map((entry) =>
        entry.input.clientNonce === nonce ? { ...entry, status: 'failed' } : entry,
      ),
    );
  }

  function removePending(nonce: string) {
    persistPending((current) => current.filter((entry) => entry.input.clientNonce !== nonce));
  }

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

  async function deliver(input: SendMessageCommand) {
    if (!token) {
      markFailed(input.clientNonce);
      return;
    }
    let message;
    try {
      message = await sendMessage(token, workspaceId, channelId, input);
    } catch {
      markFailed(input.clientNonce);
      return;
    }

    // Reached the server: nothing left to recover on reload, regardless of
    // whether the local cache-sync below succeeds.
    removePending(input.clientNonce);
    confirmDirectMessage(queryClient, identity, workspaceId, channelId, message);
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
      flashConfirmed(item.id);
    } catch {
      // Sent, just not locally merged: fall back to a full refetch rather
      // than retrying the send.
      void queryClient.invalidateQueries({ queryKey: historyKey, exact: true });
    }
  }

  function dispatch(input: SendMessageCommand, createdAt: string) {
    const replyTarget = messages.find((item) => item.message.id === input.replyToMessageId);
    const optimistic = synthesize(input, createdAt, author, replyTarget);
    markSending(input, createdAt);
    startTransition(async () => {
      addOptimisticItem(optimistic);
      await deliver(input);
    });
  }

  function send(input: Omit<SendMessageCommand, 'clientNonce'>) {
    dispatch({ ...input, clientNonce: randomId() }, new Date().toISOString());
  }

  function retry(nonce: string) {
    const entry = pendingSends.find((item) => item.input.clientNonce === nonce);
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
    const sending: DisplayItem[] = optimisticItems.map((item) => {
      const isPending =
        isMessageItem(item) &&
        item.message.clientNonce !== null &&
        !confirmedNonces.has(item.message.clientNonce);
      return {
        item,
        nonce: null,
        delivery: isPending ? 'sending' : confirmedFlash.has(item.id) ? 'confirmed' : undefined,
      };
    });
    const failed: DisplayItem[] = pendingSends
      .filter((entry) => entry.status === 'failed')
      .map((entry) => {
        const replyTarget = messages.find(
          (item) => item.message.id === entry.input.replyToMessageId,
        );
        return {
          item: synthesize(entry.input, entry.createdAt, author, replyTarget),
          nonce: entry.input.clientNonce,
          delivery: 'failed',
        };
      });
    return [...sending, ...failed];
  }, [optimisticItems, confirmedNonces, confirmedFlash, pendingSends, messages, author]);

  return { displayItems, send, retry, edit, remove };
}
