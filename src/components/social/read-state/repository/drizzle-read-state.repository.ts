import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, count, eq, gt, isNotNull, isNull, lte, max, min, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import {
  calls,
  channelEntries,
  channelMemberships,
  channels,
  chatMessages,
} from '@/database/drizzle/schema';

import type { ReadPosition, ReadPositionQuery, WorkspaceChannelUnread } from '../types';
import { ReadStateRepository } from './read-state.repository';

// A badge never needs the exact count past this: capping what gets scanned keeps
// a channel someone hasn't opened in months from turning every unread check into
// a full range scan.
const UNREAD_COUNT_CAP = 100;

// A channel_entries row is either a message or a call, never both: a call someone else
// started counts as unread the same way a message from someone else does, so a missed
// call badges the channel instead of vanishing silently.
function unreadFor(memberId: string) {
  return or(
    and(
      isNotNull(channelEntries.messageId),
      ne(chatMessages.authorMemberId, memberId),
      isNull(chatMessages.deletedAt),
    ),
    and(isNotNull(channelEntries.callId), ne(calls.startedByMemberId, memberId)),
  );
}

@Injectable()
export class DrizzleReadStateRepository extends ReadStateRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async workspaceSummary(workspaceId: string, memberId: string): Promise<WorkspaceChannelUnread[]> {
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
          unreadFor(memberId),
        ),
      )
      .orderBy(channelEntries.seq)
      .limit(UNREAD_COUNT_CAP)
      .as('unread');

    const rows = await this.txHost.tx
      .select({
        channelId: channelMemberships.channelId,
        kind: channels.kind,
        lastReadEntrySeq: channelMemberships.lastReadEntrySeq,
        unreadCount: sql<number>`count(${unread.seq})`.mapWith(Number),
      })
      .from(channelMemberships)
      .innerJoin(channels, eq(channels.id, channelMemberships.channelId))
      .leftJoinLateral(unread, sql`true`)
      .where(
        and(
          eq(channelMemberships.workspaceId, workspaceId),
          eq(channelMemberships.memberId, memberId),
        ),
      )
      .groupBy(channelMemberships.channelId, channels.kind, channelMemberships.lastReadEntrySeq);

    return rows.map((row) => ({
      channelId: row.channelId,
      kind: row.kind,
      lastReadEntrySeq: row.lastReadEntrySeq.toString(),
      unreadCount: row.unreadCount,
    }));
  }

  async position({
    channelId,
    memberId,
    ceiling,
    withPeerRead,
  }: ReadPositionQuery): Promise<ReadPosition> {
    // One capped scan both counts what is unread and finds where it starts.
    const unread = this.txHost.tx
      .select({ seq: channelEntries.seq })
      .from(channelEntries)
      .leftJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .leftJoin(calls, eq(calls.id, channelEntries.callId))
      .where(
        and(
          eq(channelEntries.channelId, channelId),
          gt(channelEntries.seq, channelMemberships.lastReadEntrySeq),
          lte(channelEntries.seq, ceiling),
          unreadFor(memberId),
        ),
      )
      .orderBy(channelEntries.seq)
      .limit(UNREAD_COUNT_CAP)
      .as('unread');

    const peers = alias(channelMemberships, 'peers');
    const peerRead = this.txHost.tx
      .select({ seq: max(peers.lastReadEntrySeq).as('peer_read_seq') })
      .from(peers)
      .where(
        and(
          eq(peers.channelId, channelId),
          ne(peers.memberId, memberId),
          withPeerRead ? undefined : sql`false`,
        ),
      )
      .as('peer_read');

    const [row] = await this.txHost.tx
      .select({
        lastReadSeq: channelMemberships.lastReadEntrySeq,
        unreadCount: count(unread.seq),
        firstUnreadSeq: min(unread.seq),
        peerReadSeq: peerRead.seq,
      })
      .from(channelMemberships)
      .leftJoinLateral(unread, sql`true`)
      .leftJoin(peerRead, sql`true`)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      )
      .groupBy(channelMemberships.lastReadEntrySeq, peerRead.seq);
    if (!row) return { state: null, firstUnreadSeq: null, peerReadSeq: null };

    const state = { lastReadEntrySeq: row.lastReadSeq.toString(), unreadCount: row.unreadCount };
    return { state, firstUnreadSeq: row.firstUnreadSeq, peerReadSeq: row.peerReadSeq };
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
      .set({
        lastReadEntrySeq: sql`greatest(${channelMemberships.lastReadEntrySeq}, ${seq})`,
      })
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
  }
}
