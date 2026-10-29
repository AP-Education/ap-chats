import type {
  DisplayItem,
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
  context: MessageHistoryItem['context'],
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
    context,
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

// The first of them the timeline holds, as history quotes it once the message is there.
function contextOf(
  messages: readonly MessageHistoryItem[],
  messageIds: string[] = [],
): MessageHistoryItem['context'] {
  const first = messages.find((item) => messageIds.includes(item.message.id));
  if (!first) return null;

  const { message, author } = first;
  return {
    count: messageIds.length,
    first: {
      id: message.id,
      authorMemberId: message.authorMemberId,
      author,
      markdown: message.markdown,
      blocks: message.blocks,
    },
  };
}

function byCreatedAt(a: DisplayItem, b: DisplayItem) {
  return a.item.createdAt.localeCompare(b.item.createdAt);
}

// History is the truth: what it already holds is left out before the outbox lets it go.
export function unsentRows(
  snapshot: OutboxSnapshot,
  delivered: ReadonlySet<string>,
  author: MessageAuthor,
  messages: readonly MessageHistoryItem[],
): DisplayItem[] {
  const rows = unsent(snapshot.entries, delivered).map((entry) => ({
    item: synthesize(
      entry.input,
      entry.createdAt,
      author,
      findMessage(messages, entry.input.replyToMessageId),
      contextOf(messages, entry.input.contextMessageIds),
    ),
    delivery: entry.status,
    pendingAttachments: snapshot.files.get(entry.input.clientNonce),
  }));

  return rows.sort(byCreatedAt);
}
