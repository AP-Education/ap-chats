import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { deleteMessages, editMessage, sendMessage } from '../api/messages-api';
import { messagingQueryKeys } from '../queryKeys';
import type { SendMessageInput } from '../types';

export interface OutgoingMessage {
  input: SendMessageInput;
  createdAt: string;
  status: 'sending' | 'failed';
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

export function useMessageOperations(workspaceId: string, channelId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const outboxKey = `ap-chats:outbox:${identity}:${workspaceId}:${channelId}`;
  const [outbox, setOutbox] = useState(() => readOutbox(outboxKey));
  const outboxRef = useRef(outbox);

  function updateOutbox(change: (current: OutgoingMessage[]) => OutgoingMessage[]) {
    const next = change(outboxRef.current);
    outboxRef.current = next;
    localStorage.setItem(outboxKey, JSON.stringify(next));
    setOutbox(next);
  }

  function refreshHistory() {
    void queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.channel(identity, workspaceId, channelId),
    });
  }

  async function deliver(outgoing: OutgoingMessage) {
    if (!token) throw new Error('Not signed in');
    try {
      const message = await sendMessage(token, workspaceId, channelId, outgoing.input);
      updateOutbox((current) =>
        current.filter((item) => item.input.clientNonce !== outgoing.input.clientNonce),
      );
      return message;
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
