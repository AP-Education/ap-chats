import { messageBlocks } from './message-blocks';
import type { Attachment, MessageModel } from './types/message.types';
import { privateAssistantMessage } from './visibility';

export type MessageView = ReturnType<typeof messageView>;

// The history hands files out with their links, so the view keeps the files' own type.
export function messageView<File extends Attachment>(
  message: Omit<MessageModel, 'attachments'> & { attachments: File[] },
  seq: bigint,
  viewerMemberId?: string,
) {
  const privateToMe =
    privateAssistantMessage(message) && message.assistantOwnerMemberId === viewerMemberId;
  return {
    id: message.id,
    seq: seq.toString(),
    authorMemberId: message.authorMemberId,
    clientNonce: privateToMe || message.authorMemberId === viewerMemberId ? message.clientNonce : null,
    markdown: message.deletedAt ? null : message.contentMarkdown,
    attachments: message.deletedAt ? [] : message.attachments,
    blocks: message.deletedAt ? [] : messageBlocks(message),
    contentVersion: message.contentVersion,
    revision: message.revision,
    replyToMessageId: message.replyToMessageId,
    quoteText: message.quoteText,
    isForwarded: message.forwardedFromMemberId !== null,
    forwardedFromMemberId: message.forwardedFromMemberId,
    createdAt: message.publishedAt ?? message.createdAt,
    privateToMe,
    assistantAnswer: privateToMe && Boolean(message.assistantQuestionId),
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
  };
}
