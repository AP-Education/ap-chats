import type { NotificationRequest } from '../delivery/types';

export interface ConversationScope {
  workspaceId: string;
  channelId: string;
}

/** A run of messages in one conversation, addressed by position, never by content. */
export interface ConversationRange extends ConversationScope {
  firstSeq: string;
  lastSeq: string;
}

/** A burst of new messages in one conversation, starting at the message that opened it. */
export interface ConversationWindow extends ConversationScope {
  firstSeq: string;
}

/** One person to alert about a conversation range; a queued job holds no message text. */
export interface ConversationAlert extends NotificationRequest, ConversationRange {
  memberId: string;
}

export interface MessageFanoutJob {
  window: ConversationWindow;
  lastSeq?: string;
  after?: string;
}
