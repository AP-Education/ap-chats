import type { HistoryRowsPage, HistoryView } from '../types/history.types';

export abstract class HistoryRepository {
  abstract messageSeq(channelId: string, messageId: string): Promise<bigint | null>;
  /** Resolves a position by either subject id in one query; message and call ids never collide. */
  abstract entrySeq(channelId: string, entryId: string): Promise<bigint | null>;
  abstract firstUnreadSeq(
    channelId: string,
    memberId: string,
    after: bigint,
    ceiling: bigint,
  ): Promise<bigint | null>;
  abstract page(
    view: HistoryView,
    direction: 'before' | 'after',
    cursor: bigint | undefined,
    ceiling: bigint,
    limit: number,
  ): Promise<HistoryRowsPage>;
}
