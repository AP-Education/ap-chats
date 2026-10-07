import type { ConversationAlert, MessageNotificationPayload } from './types';

/**
 * The one thing delivery asks the conversation's owner, since it never reads chat data itself.
 * In-process today; across a service boundary it becomes a call back to the chat service.
 */
export abstract class NotificationContent {
  /** The newest unread message worth announcing, or null once nothing is (read, deleted, muted). */
  abstract render(alert: ConversationAlert): Promise<MessageNotificationPayload | null>;
}
