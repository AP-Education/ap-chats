import type { MessageModel } from './types/message.types';

export function messageView(message: MessageModel, seq: bigint) {
  return {
    id: message.id,
    seq: seq.toString(),
    authorMemberId: message.authorMemberId,
    markdown: message.deletedAt ? null : message.contentMarkdown,
    contentVersion: message.contentVersion,
    revision: message.revision,
    replyToMessageId: message.replyToMessageId,
    quoteText: message.quoteText,
    isForwarded: message.forwardedFromMemberId !== null,
    forwardedFromMemberId: message.forwardedFromMemberId,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
  };
}
