import type { ScheduledMessageModel } from './types/scheduled-message.types';

export type ScheduledMessageView = ReturnType<typeof scheduledMessageView>;

export function scheduledMessageView(message: ScheduledMessageModel) {
  return {
    id: message.id,
    authorMemberId: message.authorMemberId,
    clientNonce: message.clientNonce,
    markdown: message.contentMarkdown,
    replyToMessageId: message.replyToMessageId,
    quoteText: message.quoteText,
    sendAt: message.sendAt,
    revision: message.revision,
    failure: message.failure,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}
