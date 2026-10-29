import type { PendingEntry, PendingStatus } from '@ap-education/timeline';

import { type ChatEntry, toEntry } from '../../timeline/chat-entry';
import type {
  DeliveryStatus,
  MessageAuthor,
  MessageHistoryItem,
  SendMessageCommand,
} from '../../types';
import type { OutboxSnapshot } from '../types';
import { unsent } from './outbox-entries';

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

const STATUS: Record<DeliveryStatus, PendingStatus> = {
  uploading: 'preparing',
  sending: 'sending',
  failed: 'failed',
};

function byCreatedAt(a: PendingEntry<ChatEntry>, b: PendingEntry<ChatEntry>) {
  return a.entry.at.localeCompare(b.entry.at);
}

// History is the truth: what it already holds is left out before the outbox lets it go.
export function unsentRows(
  snapshot: OutboxSnapshot,
  delivered: ReadonlySet<string>,
  author: MessageAuthor,
  messages: readonly MessageHistoryItem[],
): PendingEntry<ChatEntry>[] {
  const rows = unsent(snapshot.entries, delivered).map((entry) => {
    const nonce = entry.input.clientNonce;
    const replyTarget = findMessage(messages, entry.input.replyToMessageId);
    const item = synthesize(entry.input, entry.createdAt, author, replyTarget);
    const pendingAttachments = snapshot.files.get(nonce);
    const row: ChatEntry = {
      ...toEntry(item),
      kind: 'MESSAGE',
      payload: { item, pendingAttachments },
    };
    return { nonce, entry: row, status: STATUS[entry.status] };
  });

  return rows.sort(byCreatedAt);
}
