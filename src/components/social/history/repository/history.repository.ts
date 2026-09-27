import type { HistoryRowsPage } from '../types/history.types';

export abstract class HistoryRepository {
  abstract page(
    channelId: string,
    direction: 'before' | 'after',
    cursor: bigint | undefined,
    ceiling: bigint,
    limit: number,
  ): Promise<HistoryRowsPage>;
}
