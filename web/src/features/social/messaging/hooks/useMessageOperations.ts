import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { confirmDirectMessage } from '@/features/social/direct-messages/cache';

import {
  deleteMessages,
  editMessage,
  getMessage,
  historyPage,
  sendMessage,
} from '../api/messages-api';
import { catchUpHistory, mergeHistoryItem } from '../history-cache';
import { messagingQueryKeys } from '../queryKeys';
import type { HistoryItem, MessageAuthor, SendMessageInput } from '../types';
import type { HistoryPage } from '../types';
import type { PageCursor } from './useMessageHistory';

export interface OutgoingMessage {
  input: SendMessageInput;
  createdAt: string;
  status: 'sending' | 'failed' | 'confirmed';
  confirmedItem?: HistoryItem;
}

function readOutbox(key: string): OutgoingMessage[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((item): item is OutgoingMessage => {
        if (typeof item !== 'object' || item === null) return false;
        const candidate = item as Partial<OutgoingMessage>;
        return (
          typeof candidate.input?.markdown === 'string' &&
          typeof candidate.input?.clientNonce === 'string' &&
          typeof candidate.createdAt === 'string'
        );
      })
      .map((item) => ({ ...item, status: 'failed' }));
  } catch {
    return [];
  }
}

export function useMessageOperations(
  workspaceId: string,
  channelId: string,
  author: MessageAuthor,
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const outboxKey = `ap-chats:outbox:${identity}:${workspaceId}:${channelId}`;
  const [outbox, setOutbox] = useState(() => readOutbox(outboxKey));
  const outboxRef = useRef(outbox);

  function updateOutbox(change: (current: OutgoingMessage[]) => OutgoingMessage[]) {
    const next = change(outboxRef.current);
    outboxRef.current = next;
    const unresolved = next.filter((item) => item.status !== 'confirmed');
    if (unresolved.length) localStorage.setItem(outboxKey, JSON.stringify(unresolved));
    else localStorage.removeItem(outboxKey);
    setOutbox(next);
  }

  function refreshHistory() {
    void queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId),
    });
  }

  async function deliver(outgoing: OutgoingMessage) {
    if (!token) throw new Error('Not signed in');
    let message;
    try {
      message = await sendMessage(token, workspaceId, channelId, outgoing.input);
    } catch (error) {
      updateOutbox((current) =>
        current.map((item) =>
          item.input.clientNonce === outgoing.input.clientNonce
            ? { ...item, status: 'failed' }
            : item,
        ),
      );
      throw error;
    }

    confirmDirectMessage(queryClient, identity, workspaceId, channelId, message);
    const historyKey = messagingQueryKeys.history(identity, workspaceId, channelId);
    try {
      let item: HistoryItem;
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
      updateOutbox((current) =>
        current.map((entry) =>
          entry.input.clientNonce === outgoing.input.clientNonce
            ? { ...entry, status: 'confirmed', confirmedItem: item }
            : entry,
        ),
      );
      window.setTimeout(() => {
        const history = queryClient.getQueryData<InfiniteData<HistoryPage, PageCursor>>(historyKey);
        if (
          history?.pages.some((page) => page.items.some((entry) => entry.message.id === message.id))
        )
          updateOutbox((current) =>
            current.filter((entry) => entry.input.clientNonce !== outgoing.input.clientNonce),
          );
      }, 900);
    } catch {
      void queryClient.invalidateQueries({ queryKey: historyKey, exact: true });
      updateOutbox((current) =>
        current.map((item) =>
          item.input.clientNonce === outgoing.input.clientNonce
            ? { ...item, status: 'confirmed' }
            : item,
        ),
      );
    }
    return message;
  }

  function send(input: Omit<SendMessageInput, 'clientNonce'>) {
    const outgoing: OutgoingMessage = {
      input: { ...input, clientNonce: crypto.randomUUID() },
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    updateOutbox((current) => [...current, outgoing]);
    return deliver(outgoing);
  }

  function retry(nonce: string) {
    const outgoing = outbox.find((item) => item.input.clientNonce === nonce);
    if (!outgoing) return;
    updateOutbox((current) =>
      current.map((item) =>
        item.input.clientNonce === nonce ? { ...item, status: 'sending' } : item,
      ),
    );
    return deliver(outgoing);
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

  return { outbox, send, retry, edit, remove };
}
