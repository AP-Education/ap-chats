import type { HistoryRowsPage } from '../types/history.types';

export abstract class HistoryRepository {
  abstract messageSeq(channelId: string, messageId: string): Promise<bigint | null>;
  abstract firstUnreadSeq(
    channelId: string,
    memberId: string,
    after: bigint,
    ceiling: bigint,
  ): Promise<bigint | null>;
  abstract page(
    channelId: string,
    direction: 'before' | 'after',
    cursor: bigint | undefined,
    ceiling: bigint,
    limit: number,
  ): Promise<HistoryRowsPage>;
}
