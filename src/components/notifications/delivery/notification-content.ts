import type { ConversationAlert, MessageNotificationPayload } from './types';

/**
 * What delivery asks the conversation's owner, since it never reads chat data itself.
 * In-process today; across a service boundary it becomes a call back to the chat service.
 */
export abstract class NotificationContent {
  /** Position of the newest message, or null once the conversation is gone for this person. */
  abstract latestSeq(alert: ConversationAlert): Promise<bigint | null>;

  /** Null when nothing in the range still deserves an alert (read, deleted, muted). */
  abstract findEligible(alert: ConversationAlert): Promise<{ urgent: boolean } | null>;

  abstract render(alert: ConversationAlert): Promise<MessageNotificationPayload | null>;
}
