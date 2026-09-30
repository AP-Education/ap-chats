import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, count, eq, gt, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';

import { calls, channelEntries, channelMemberships, chatMessages } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import { ReadStateRepository } from './read-state.repository';

// A badge never needs the exact count past this: capping what gets scanned keeps
// a channel someone hasn't opened in months from turning every unread check into
// a full range scan.
const UNREAD_COUNT_CAP = 100;

@Injectable()
export class DrizzleReadStateRepository extends ReadStateRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async workspaceSummary(workspaceId: string, memberId: string) {
    // Correlated per membership row via LATERAL: one query, and Postgres stops
    // each channel's scan at UNREAD_COUNT_CAP instead of walking its full backlog.
    const unread = this.txHost.tx
      .select({ seq: channelEntries.seq })
      .from(channelEntries)
      .leftJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .leftJoin(calls, eq(calls.id, channelEntries.callId))
      .where(
        and(
          eq(channelEntries.channelId, channelMemberships.channelId),
          gt(channelEntries.seq, channelMemberships.lastReadEntrySeq),
          // A channel_entries row is either a message or a call, never both —
          // a call someone else started counts as unread the same way a
          // message from someone else does, so a missed call badges the
          // channel instead of vanishing silently.
          or(
            and(
              isNotNull(channelEntries.messageId),
              ne(chatMessages.authorMemberId, memberId),
              isNull(chatMessages.deletedAt),
            ),
            and(isNotNull(channelEntries.callId), ne(calls.startedByMemberId, memberId)),
          ),
        ),
      )
      .orderBy(channelEntries.seq)
      .limit(UNREAD_COUNT_CAP)
      .as('unread');

    const rows = await this.txHost.tx
      .select({
        channelId: channelMemberships.channelId,
        lastReadEntrySeq: channelMemberships.lastReadEntrySeq,
        unreadCount: sql<number>`count(${unread.seq})`.mapWith(Number),
      })
      .from(channelMemberships)
      .leftJoinLateral(unread, sql`true`)
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
    return this.cappedUnreadCount(channelId, memberId, after, ceiling);
  }

  /** Counts unread entries up to `UNREAD_COUNT_CAP`, stopping the scan there rather than at the end of the range. */
  private async cappedUnreadCount(
    channelId: string,
    memberId: string,
    after: bigint,
    ceiling?: bigint,
  ): Promise<number> {
    const capped = this.txHost.tx
      .select({ seq: channelEntries.seq })
      .from(channelEntries)
      .leftJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .leftJoin(calls, eq(calls.id, channelEntries.callId))
      .where(
        and(
          eq(channelEntries.channelId, channelId),
          gt(channelEntries.seq, after),
          ceiling === undefined ? undefined : lte(channelEntries.seq, ceiling),
          or(
            and(
              isNotNull(channelEntries.messageId),
              ne(chatMessages.authorMemberId, memberId),
              isNull(chatMessages.deletedAt),
            ),
            and(isNotNull(channelEntries.callId), ne(calls.startedByMemberId, memberId)),
          ),
        ),
      )
      .orderBy(channelEntries.seq)
      .limit(UNREAD_COUNT_CAP)
      .as('capped');
    const [row] = await this.txHost.tx.select({ count: count() }).from(capped);
    return row?.count ?? 0;
  }
}
