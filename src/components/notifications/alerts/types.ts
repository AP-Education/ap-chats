import type { ConversationRange } from '../delivery/types';

export interface MessageNotificationSource extends ConversationRange {
  actorMemberId: string;
}

export interface MessageFanoutJob {
  source: MessageNotificationSource;
  after?: string;
}

export const PUSH_FANOUT_QUEUE = 'push.message-fanout';
