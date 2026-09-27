import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';

import { channelEntries, chatMessages, messagePins } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { HistoryRowsPage } from '../types/history.types';
import { HistoryRepository } from './history.repository';

@Injectable()
export class DrizzleHistoryRepository extends HistoryRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async page(
    channelId: string,
    direction: 'before' | 'after',
    cursor: bigint | undefined,
    ceiling: bigint,
    limit: number,
  ): Promise<HistoryRowsPage> {
    const rows = await this.txHost.tx
      .select({
        seq: channelEntries.seq,
        createdAt: channelEntries.createdAt,
        message: chatMessages,
        pin: messagePins,
      })
      .from(channelEntries)
      .innerJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .leftJoin(
        messagePins,
        and(
          eq(messagePins.channelId, channelEntries.channelId),
          eq(messagePins.messageId, channelEntries.messageId),
        ),
      )
      .where(
        and(
          eq(channelEntries.channelId, channelId),
          cursor === undefined
            ? direction === 'after'
              ? gt(channelEntries.seq, 0n)
              : lt(channelEntries.seq, ceiling + 1n)
            : direction === 'after'
              ? gt(channelEntries.seq, cursor)
              : lt(channelEntries.seq, cursor),
          lt(channelEntries.seq, ceiling + 1n),
        ),
      )
      .orderBy(direction === 'after' ? asc(channelEntries.seq) : desc(channelEntries.seq))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return { rows: direction === 'before' ? page.reverse() : page, hasMore };
  }
}
