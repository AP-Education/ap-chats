import type { NotificationPayload, NotificationRequest } from './types';

/**
 * The one thing delivery asks the requester, since it never reads their data itself.
 * In-process today; across a service boundary it becomes a call back to the requesting service.
 */
export abstract class NotificationContent {
  /** What to show right now, or null once nothing is worth announcing anymore. */
  abstract render(request: NotificationRequest): Promise<NotificationPayload | null>;
}
