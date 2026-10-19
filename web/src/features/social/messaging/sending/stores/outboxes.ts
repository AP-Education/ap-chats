import type { QueryClient } from '@tanstack/react-query';

import { sendMessage } from '../../api/messages-api';
import { UploadQueue } from '../../attachments/upload-queue';
import { localOutboxStorage } from '../api/outbox-storage';
import { recordSentMessage } from '../api/record-sent';
import type { ConversationKey } from '../types';
import { ConversationOutbox } from './conversation-outbox';

/** A conversation's outgoing side: the files its composer holds and the messages on their way. */
export interface ConversationSending {
  uploads: UploadQueue;
  outbox: ConversationOutbox;
}

export interface Outboxes {
  for: (conversation: ConversationKey) => ConversationSending;
  /** Another person's conversations stop and go. */
  setSession: (identity: string | undefined, token: string | undefined) => void;
}

export function createOutboxes(queryClient: QueryClient): Outboxes {
  const conversations = new Map<string, ConversationSending & ConversationKey>();
  let token: string | undefined;

  function requireToken() {
    if (!token) throw new Error('Not signed in');
    return token;
  }

  function open(conversation: ConversationKey): ConversationSending {
    const { identity, workspaceId, channelId } = conversation;
    const uploads = new UploadQueue({ workspaceId, channelId }, () => token);
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

  function close({ uploads, outbox }: ConversationSending) {
    outbox.dispose();
    uploads.dispose();
  }

  return {
    for: (conversation) => {
      const key = `${conversation.identity}:${conversation.workspaceId}:${conversation.channelId}`;
      const existing = conversations.get(key);
      if (existing) return existing;

      const opened = { ...conversation, ...open(conversation) };
      conversations.set(key, opened);
      return opened;
    },
    setSession: (identity, nextToken) => {
      token = nextToken;
      for (const [key, conversation] of conversations) {
        if (conversation.identity === identity) continue;
        close(conversation);
        conversations.delete(key);
      }
    },
  };
}
