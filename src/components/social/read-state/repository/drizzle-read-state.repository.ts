import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, count, eq, gt, isNull, lte, ne, sql } from 'drizzle-orm';

import { channelEntries, channelMemberships, chatMessages } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import { ReadStateRepository } from './read-state.repository';

@Injectable()
export class DrizzleReadStateRepository extends ReadStateRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async workspaceSummary(workspaceId: string, memberId: string) {
    const rows = await this.txHost.tx
      .select({
        channelId: channelMemberships.channelId,
        lastReadEntrySeq: channelMemberships.lastReadEntrySeq,
        unreadCount: sql<number>`count(${chatMessages.id})`.mapWith(Number),
      })
      .from(channelMemberships)
      .leftJoin(
        channelEntries,
        and(
          eq(channelEntries.channelId, channelMemberships.channelId),
          gt(channelEntries.seq, channelMemberships.lastReadEntrySeq),
        ),
      )
      .leftJoin(
        chatMessages,
        and(
          eq(chatMessages.id, channelEntries.messageId),
          ne(chatMessages.authorMemberId, memberId),
          isNull(chatMessages.deletedAt),
        ),
      )
      .where(
        and(
          eq(channelMemberships.workspaceId, workspaceId),
          eq(channelMemberships.memberId, memberId),
        ),
      )
      .groupBy(channelMemberships.channelId, channelMemberships.lastReadEntrySeq);
    return rows.map((row) => ({
      channelId: row.channelId,
      lastReadEntrySeq: row.lastReadEntrySeq.toString(),
      unreadCount: row.unreadCount,
    }));
  }

  async lastReadSeq(channelId: string, memberId: string): Promise<bigint | null> {
    const [row] = await this.txHost.tx
      .select({ seq: channelMemberships.lastReadEntrySeq })
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    return row?.seq ?? null;
  }

  async entryExists(channelId: string, seq: bigint): Promise<boolean> {
    const [row] = await this.txHost.tx
      .select({ id: channelEntries.id })
      .from(channelEntries)
      .where(and(eq(channelEntries.channelId, channelId), eq(channelEntries.seq, seq)));
    return !!row;
  }

  async advance(channelId: string, memberId: string, seq: bigint): Promise<void> {
    await this.txHost.tx
      .update(channelMemberships)
      .set({ lastReadEntrySeq: seq })
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
  }

  async unreadCount(
    channelId: string,
    memberId: string,
    after: bigint,
    ceiling: bigint,
  ): Promise<number> {
    const [row] = await this.txHost.tx
      .select({ count: count() })
      .from(channelEntries)
      .innerJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .where(
        and(
          eq(channelEntries.channelId, channelId),
          gt(channelEntries.seq, after),
          lte(channelEntries.seq, ceiling),
          ne(chatMessages.authorMemberId, memberId),
          isNull(chatMessages.deletedAt),
        ),
      );
    return row?.count ?? 0;
  }
}
