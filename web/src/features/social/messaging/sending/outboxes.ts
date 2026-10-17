import type { QueryClient } from '@tanstack/react-query';

import { sendMessage } from '../api/messages-api';
import { UploadQueue } from '../attachments/upload-queue';
import { arriveInHistory, type ConversationKey } from './arrival';
import { ConversationOutbox, type OutboxStorage } from './conversation-outbox';
import type { OutboxEntry } from './outbox';

/** A conversation's outgoing side: the files its composer holds and the messages on their way. */
export interface ConversationSending {
  uploads: UploadQueue;
  outbox: ConversationOutbox;
}

function localStorageAt(key: string): OutboxStorage {
  return {
    read: () => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? '[]');
      } catch {
        return [];
      }
    },
    write: (entries: readonly OutboxEntry[]) => {
      if (entries.length) localStorage.setItem(key, JSON.stringify(entries));
      else localStorage.removeItem(key);
    },
  };
}

/** Every conversation's outgoing side for the signed-in person, kept while Chats runs. */
export class Outboxes {
  private readonly conversations = new Map<string, ConversationSending & ConversationKey>();
  private readonly queryClient: QueryClient;
  private token: string | undefined;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /** Follows the session; another person's conversations stop and go. */
  setSession(identity: string | undefined, token: string | undefined) {
    this.token = token;
    for (const [key, conversation] of this.conversations) {
      if (conversation.identity === identity) continue;
      this.close(conversation);
      this.conversations.delete(key);
    }
  }

  for(conversation: ConversationKey): ConversationSending {
    const key = `${conversation.identity}:${conversation.workspaceId}:${conversation.channelId}`;
    let sending = this.conversations.get(key);
    if (!sending) {
      sending = { ...conversation, ...this.open(conversation) };
      this.conversations.set(key, sending);
    }
    return sending;
  }

  private open(conversation: ConversationKey): ConversationSending {
    const { identity, workspaceId, channelId } = conversation;
    const token = () => this.token;
    const requireToken = () => {
      if (!this.token) throw new Error('Not signed in');
      return this.token;
    };
    const uploads = new UploadQueue({ workspaceId, channelId }, token);
    const outbox = new ConversationOutbox({
      uploads,
      storage: localStorageAt(`ap-chats:outbox:${identity}:${workspaceId}:${channelId}`),
      post: (input, signal) => sendMessage(requireToken(), workspaceId, channelId, input, signal),
      arrive: async (message, author) => {
        if (this.token) {
          await arriveInHistory(this.queryClient, conversation, this.token, message, author);
        }
      },
    });
    return { uploads, outbox };
  }

  private close({ uploads, outbox }: ConversationSending) {
    outbox.dispose();
    uploads.dispose();
  }
}
