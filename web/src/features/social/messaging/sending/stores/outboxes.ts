import { UploadQueue } from '@ap-education/timeline/composer';
import type { QueryClient } from '@tanstack/react-query';

import { sendMessage } from '../../api/messages-api';
import { uploadTransport } from '../../attachments/attachments-api';
import type { Attachment } from '../../attachments/types';
import { localOutboxStorage } from '../api/outbox-storage';
import { recordSentMessage } from '../api/record-sent';
import type { ConversationKey } from '../types';
import { sendingInFlight } from '../utils/sending-in-flight';
import { ConversationOutbox } from './conversation-outbox';

/** A conversation's outgoing side: the files its composer holds and the messages on their way. */
export interface ConversationSending {
  uploads: UploadQueue<Attachment>;
  outbox: ConversationOutbox;
}

export interface Outboxes {
  for: (conversation: ConversationKey) => ConversationSending;
  /** Another person's conversations stop and go. */
  setSession: (identity: string | undefined, token: string | undefined) => void;
  /** Whether any conversation has a message on its way or a composer file going up. */
  isSending: () => boolean;
  /** Hears every change to any conversation's sends and files. */
  subscribe: (listener: () => void) => () => void;
}

interface OpenConversation extends ConversationSending, ConversationKey {
  stopListening: () => void;
}

export function createOutboxes(queryClient: QueryClient): Outboxes {
  const conversations = new Map<string, OpenConversation>();
  const listeners = new Set<() => void>();
  let token: string | undefined;

  function changed() {
    listeners.forEach((listener) => listener());
  }

  function requireToken() {
    if (!token) throw new Error('Not signed in');
    return token;
  }

  function open(conversation: ConversationKey): ConversationSending {
    const { identity, workspaceId, channelId } = conversation;
    const uploads = new UploadQueue(uploadTransport({ workspaceId, channelId }, requireToken));
    const outbox = new ConversationOutbox({
      uploads,
      storage: localOutboxStorage(`ap-chats:outbox:${identity}:${workspaceId}:${channelId}`),
      post: (input, signal) => sendMessage(requireToken(), workspaceId, channelId, input, signal),
      recordSent: async (message) => {
        if (token) await recordSentMessage(queryClient, conversation, token, message);
      },
    });

    return { uploads, outbox };
  }

  function close({ uploads, outbox, stopListening }: OpenConversation) {
    stopListening();
    outbox.dispose();
    uploads.dispose();
  }

  return {
    for: (conversation) => {
      const key = `${conversation.identity}:${conversation.workspaceId}:${conversation.channelId}`;
      const existing = conversations.get(key);
      if (existing) return existing;

      const sending = open(conversation);
      const stopUploads = sending.uploads.subscribe(changed);
      const stopOutbox = sending.outbox.subscribe(changed);
      const stopListening = () => {
        stopUploads();
        stopOutbox();
      };
      conversations.set(key, { ...conversation, ...sending, stopListening });
      return sending;
    },
    setSession: (identity, nextToken) => {
      token = nextToken;
      for (const [key, conversation] of conversations) {
        if (conversation.identity === identity) continue;
        close(conversation);
        conversations.delete(key);
      }
      changed();
    },
    isSending: () =>
      [...conversations.values()].some(({ outbox, uploads }) =>
        sendingInFlight(outbox.getSnapshot().entries, uploads.getSnapshot()),
      ),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
