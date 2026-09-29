import { useMemo } from 'react';

import type { OutgoingMessage } from '../../hooks/useMessageOperations';
import type { MessageAuthor, MessageHistoryItem } from '../../types';
import { isMessageItem } from '../../types';

export interface DisplayItem {
  item: MessageHistoryItem;
  delivery: OutgoingMessage['status'] | undefined;
  nonce: string | null;
}

/**
 * Merges confirmed history with the outbox: a pending send stands in as its
 * own synthesized history item (with its own delivery status) until the
 * confirmed item for the same nonce arrives and takes its place.
 */
export function useDisplayItems(
  items: MessageHistoryItem[],
  outbox: OutgoingMessage[],
  author: MessageAuthor,
): DisplayItem[] {
  return useMemo(() => {
    const pendingNonces = new Set(outbox.map((entry) => entry.input.clientNonce));
    const messages = items.filter(isMessageItem);
    const confirmed = items
      .filter(
        (item) =>
          !isMessageItem(item) ||
          !item.message.clientNonce ||
          !pendingNonces.has(item.message.clientNonce),
      )
      .map((item) => ({
        item,
        delivery: undefined as OutgoingMessage['status'] | undefined,
        nonce: null as string | null,
      }));
    const outgoing = outbox.map((entry) => {
      const replyTarget = messages.find((item) => item.message.id === entry.input.replyToMessageId);
      const item: MessageHistoryItem = entry.confirmedItem ?? {
        type: 'MESSAGE',
        id: entry.input.clientNonce,
        seq: '0',
        createdAt: entry.createdAt,
        message: {
          id: entry.input.clientNonce,
          seq: '0',
          authorMemberId: author.memberId,
          clientNonce: entry.input.clientNonce,
          markdown: entry.input.markdown,
          contentVersion: 1,
          revision: 1,
          replyToMessageId: entry.input.replyToMessageId ?? null,
          quoteText: entry.input.quoteText ?? null,
          isForwarded: false,
          forwardedFromMemberId: null,
          createdAt: entry.createdAt,
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
      return { item, delivery: entry.status, nonce: entry.input.clientNonce };
    });
    return [...confirmed, ...outgoing];
  }, [items, outbox, author]);
}
