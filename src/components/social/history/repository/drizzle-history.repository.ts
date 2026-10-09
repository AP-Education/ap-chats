import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, lte, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  calls,
  channelEntries,
  chatMessages,
  messageMentions,
  messagePins,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type {
  HistoryRow,
  HistoryRowsPage,
  HistoryView,
  MessageMentions,
} from '../types/history.types';
import { HistoryRepository } from './history.repository';

@Injectable()
export class DrizzleHistoryRepository extends HistoryRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async messageSeq(channelId: string, messageId: string): Promise<bigint | null> {
    const [row] = await this.txHost.tx
      .select({ seq: channelEntries.seq })
      .from(channelEntries)
      .where(and(eq(channelEntries.channelId, channelId), eq(channelEntries.messageId, messageId)));
    return row?.seq ?? null;
  }

  async entrySeq(channelId: string, entryId: string): Promise<bigint | null> {
    const [row] = await this.txHost.tx
      .select({ seq: channelEntries.seq })
      .from(channelEntries)
      .where(
        and(
          eq(channelEntries.channelId, channelId),
          or(eq(channelEntries.messageId, entryId), eq(channelEntries.callId, entryId)),
        ),
      );
    return row?.seq ?? null;
  }

  async firstUnreadSeq(
    channelId: string,
    memberId: string,
    after: bigint,
    ceiling: bigint,
  ): Promise<bigint | null> {
    const [row] = await this.txHost.tx
      .select({ seq: channelEntries.seq })
      .from(channelEntries)
      .leftJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .leftJoin(calls, eq(calls.id, channelEntries.callId))
      .where(
        and(
          eq(channelEntries.channelId, channelId),
          gt(channelEntries.seq, after),
          lte(channelEntries.seq, ceiling),
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
      .orderBy(asc(channelEntries.seq))
      .limit(1);
    return row?.seq ?? null;
  }

  // The row shape below is inferred from this query, not hand-duplicated:
  // `Row` in toHistoryRow() is `Awaited<ReturnType<typeof this.rowsQuery>>[number]`.
  private rowsQuery(
    channelId: string,
    direction: 'before' | 'after',
    cursor: bigint | undefined,
    ceiling: bigint,
    limit: number,
  ) {
    const replyMessages = alias(chatMessages, 'reply_messages');
    const authorMembers = alias(workspaceMembers, 'author_members');
    const replyAuthorMembers = alias(workspaceMembers, 'reply_author_members');
    const forwardAuthorMembers = alias(workspaceMembers, 'forward_author_members');
    const startedByMembers = alias(workspaceMembers, 'started_by_members');
    const authors = alias(userProfiles, 'authors');
    const replyAuthors = alias(userProfiles, 'reply_authors');
    const forwardAuthors = alias(userProfiles, 'forward_authors');
    const startedByProfiles = alias(userProfiles, 'started_by_profiles');
    return this.txHost.tx
      .select({
        seq: channelEntries.seq,
        createdAt: channelEntries.createdAt,
        message: chatMessages,
        authorProfile: { displayName: authors.displayName, avatarPath: authors.avatarPath },
        reply: replyMessages,
        replyAuthorProfile: {
          displayName: replyAuthors.displayName,
          avatarPath: replyAuthors.avatarPath,
        },
        forwardAuthorProfile: {
          displayName: forwardAuthors.displayName,
          avatarPath: forwardAuthors.avatarPath,
        },
        pin: messagePins,
        call: calls,
        startedByProfile: {
          displayName: startedByProfiles.displayName,
          avatarPath: startedByProfiles.avatarPath,
        },
      })
      .from(channelEntries)
      .leftJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .leftJoin(authorMembers, eq(authorMembers.id, chatMessages.authorMemberId))
      .leftJoin(authors, eq(authors.id, authorMembers.userProfileId))
      .leftJoin(replyMessages, eq(replyMessages.id, chatMessages.replyToMessageId))
      .leftJoin(replyAuthorMembers, eq(replyAuthorMembers.id, replyMessages.authorMemberId))
      .leftJoin(replyAuthors, eq(replyAuthors.id, replyAuthorMembers.userProfileId))
      .leftJoin(
        forwardAuthorMembers,
        eq(forwardAuthorMembers.id, chatMessages.forwardedFromMemberId),
      )
      .leftJoin(forwardAuthors, eq(forwardAuthors.id, forwardAuthorMembers.userProfileId))
      .leftJoin(
        messagePins,
        and(
          eq(messagePins.channelId, channelEntries.channelId),
          eq(messagePins.messageId, channelEntries.messageId),
        ),
      )
      .leftJoin(calls, eq(calls.id, channelEntries.callId))
      .leftJoin(startedByMembers, eq(startedByMembers.id, calls.startedByMemberId))
      .leftJoin(startedByProfiles, eq(startedByProfiles.id, startedByMembers.userProfileId))
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
          // A deleted message is a tombstone, not history to show: excluded
          // from the projection itself rather than fetched and hidden by the
          // client. Call entries (messageId null) always pass through.
          or(isNull(channelEntries.messageId), isNull(chatMessages.deletedAt)),
        ),
      )
      .orderBy(direction === 'after' ? asc(channelEntries.seq) : desc(channelEntries.seq))
      .limit(limit + 1);
  }

  async page(
    { channelId, viewerMemberId }: HistoryView,
    direction: 'before' | 'after',
    cursor: bigint | undefined,
    ceiling: bigint,
    limit: number,
  ): Promise<HistoryRowsPage> {
    const rows = await this.rowsQuery(channelId, direction, cursor, ceiling, limit);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const messageIds = page.flatMap((row) => (row.message ? [row.message.id] : []));
    const mentions = await this.pageMentions(messageIds, viewerMemberId);
    const ordered = direction === 'before' ? page.reverse() : page;
    return { rows: ordered.map((row) => this.toHistoryRow(row, mentions)), hasMore };
  }

  private async pageMentions(messageIds: string[], viewerMemberId: string) {
    const rows = messageIds.length
      ? await this.txHost.tx
          .select({
            messageId: messageMentions.messageId,
            via: messageMentions.via,
            memberId: workspaceMembers.id,
            displayName: userProfiles.displayName,
            avatarPath: userProfiles.avatarPath,
          })
          .from(messageMentions)
          .innerJoin(workspaceMembers, eq(workspaceMembers.id, messageMentions.memberId))
          .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
          .where(
            and(
              inArray(messageMentions.messageId, messageIds),
              // @everyone fans out to the whole channel; only named members and the viewer matter here.
              or(eq(messageMentions.via, 'direct'), eq(messageMentions.memberId, viewerMemberId)),
            ),
          )
      : [];

    const byMessage = new Map<string, MessageMentions>();
    for (const { messageId, via, ...member } of rows) {
      const mentions = byMessage.get(messageId) ?? { named: [], viewer: false };
      if (via === 'direct') mentions.named.push(member);
      if (member.memberId === viewerMemberId) mentions.viewer = true;
      byMessage.set(messageId, mentions);
    }
    return byMessage;
  }

  private toHistoryRow(
    row: Awaited<ReturnType<typeof this.rowsQuery>>[number],
    mentionsByMessage: Map<string, MessageMentions>,
  ): HistoryRow {
    if (row.call) {
      if (!row.startedByProfile) throw new Error('Call entry missing its starter profile');
      return {
        type: 'CALL',
        seq: row.seq,
        createdAt: row.createdAt,
        call: row.call,
        startedByProfile: row.startedByProfile,
      };
    }
    if (!row.message || !row.authorProfile)
      throw new Error('channel_entries row has neither message nor call');
    return {
      type: 'MESSAGE',
      seq: row.seq,
      createdAt: row.createdAt,
      message: row.message,
      authorProfile: row.authorProfile,
      reply: row.reply,
      replyAuthorProfile: row.replyAuthorProfile,
      forwardAuthorProfile: row.forwardAuthorProfile,
      pin: row.pin,
      mentions: mentionsByMessage.get(row.message.id)?.named ?? [],
      mentionsViewer: mentionsByMessage.get(row.message.id)?.viewer ?? false,
    };
  }
}
