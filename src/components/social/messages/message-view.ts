import type { MessageModel } from './types/message.types';

export function messageView(message: MessageModel, seq: bigint, viewerMemberId?: string) {
  return {
    id: message.id,
    seq: seq.toString(),
    authorMemberId: message.authorMemberId,
    clientNonce: message.authorMemberId === viewerMemberId ? message.clientNonce : null,
    markdown: message.deletedAt ? null : message.contentMarkdown,
    attachments: message.deletedAt ? [] : message.attachments,
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
