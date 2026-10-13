import type { ConversationRow, InboxCursor } from '../types';

export abstract class DirectInboxRepository {
  abstract memberIdsOf(userId: string): Promise<string[]>;

  abstract find(viewerIds: string[], channelId: string): Promise<ConversationRow | undefined>;

  abstract page(
    viewerIds: string[],
    cursor: InboxCursor | undefined,
    limit: number,
  ): Promise<ConversationRow[]>;

  /** Only messages from the other side count as unread. */
  abstract unread(
    viewerIds: string[],
    limit: number,
  ): Promise<Array<{ row: ConversationRow; unreadCount: number }>>;
}
