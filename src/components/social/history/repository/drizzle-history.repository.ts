import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, desc, eq, gt, isNotNull, isNull, lt, lte, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  calls,
  channelEntries,
  chatMessages,
  messageMentions,
  messagePins,
  messageReactions,
  messageReactionSummaries,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { MessageReaction } from '../../reactions/types/reaction.types';
import type {
  HistoryPageQuery,
  HistoryRow,
  HistoryRowsPage,
  Mention,
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
  private rowsQuery({
    channelId,
    viewerMemberId,
    direction,
    cursor,
    ceiling,
    limit,
  }: HistoryPageQuery) {
    const replyMessages = alias(chatMessages, 'reply_messages');
    const authorMembers = alias(workspaceMembers, 'author_members');
    const replyAuthorMembers = alias(workspaceMembers, 'reply_author_members');
    const forwardAuthorMembers = alias(workspaceMembers, 'forward_author_members');
    const startedByMembers = alias(workspaceMembers, 'started_by_members');
    const authors = alias(userProfiles, 'authors');
    const replyAuthors = alias(userProfiles, 'reply_authors');
    const forwardAuthors = alias(userProfiles, 'forward_authors');
    const startedByProfiles = alias(userProfiles, 'started_by_profiles');
    const mentions = this.mentionsOfMessage();
    const reactions = this.reactionsOfMessage(viewerMemberId);

    const pageBound =
      direction === 'after'
        ? gt(channelEntries.seq, cursor ?? 0n)
        : lt(channelEntries.seq, cursor ?? ceiling + 1n);

    return this.txHost.tx
      .select({
        seq: channelEntries.seq,
        createdAt: channelEntries.createdAt,
        message: chatMessages,
        authorProfile: { displayName: authors.displayName, avatarPath: authors.avatarPath },
        reply: {
          id: replyMessages.id,
          authorMemberId: replyMessages.authorMemberId,
          contentMarkdown: replyMessages.contentMarkdown,
          deletedAt: replyMessages.deletedAt,
        },
        replyAuthorProfile: {
          displayName: replyAuthors.displayName,
          avatarPath: replyAuthors.avatarPath,
        },
        forwardAuthorProfile: {
          displayName: forwardAuthors.displayName,
          avatarPath: forwardAuthors.avatarPath,
        },
        pin: messagePins,
        mentions: mentions.mentions,
        reactions: reactions.reactions,
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
      .leftJoinLateral(mentions, sql`true`)
      .leftJoinLateral(reactions, sql`true`)
      .leftJoin(calls, eq(calls.id, channelEntries.callId))
      .leftJoin(startedByMembers, eq(startedByMembers.id, calls.startedByMemberId))
      .leftJoin(startedByProfiles, eq(startedByProfiles.id, startedByMembers.userProfileId))
      .where(
        and(
          eq(channelEntries.channelId, channelId),
          pageBound,
          lte(channelEntries.seq, ceiling),
          // A deleted message is a tombstone, not history to show: excluded
          // from the projection itself rather than fetched and hidden by the
          // client. Call entries (messageId null) always pass through.
          or(isNull(channelEntries.messageId), isNull(chatMessages.deletedAt)),
        ),
      )
      .orderBy(direction === 'after' ? asc(channelEntries.seq) : desc(channelEntries.seq))
      .limit(limit + 1);
  }

  // Aggregated per row in the page query: a plain join would repeat the row per mention or
  // reaction and break the page limit.
  private mentionsOfMessage() {
    const mention = sql`json_build_object(
      'memberId', ${workspaceMembers.id},
      'displayName', ${userProfiles.displayName},
      'avatarPath', ${userProfiles.avatarPath}
    )`;

    return this.txHost.tx
      .select({ mentions: sql<Mention[]>`coalesce(json_agg(${mention}), '[]')`.as('mentions') })
      .from(messageMentions)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, messageMentions.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(eq(messageMentions.messageId, chatMessages.id))
      .as('message_mention_list');
  }

  private reactionsOfMessage(viewerMemberId: string) {
    const summary = messageReactionSummaries;
    const viewerReacted = sql`exists (
      select 1 from ${messageReactions}
      where ${messageReactions.messageId} = ${summary.messageId}
        and ${messageReactions.emoji} = ${summary.emoji}
        and ${messageReactions.memberId} = ${viewerMemberId}
    )`;
    const reaction = sql`json_build_object(
      'emoji', ${summary.emoji},
      'count', ${summary.count},
      'recentMemberIds', ${summary.recentMemberIds},
      'reacted', ${viewerReacted}
    )`;

    return this.txHost.tx
      .select({
        reactions: sql<MessageReaction[]>`coalesce(
          json_agg(${reaction} order by ${summary.firstReactedAt}),
          '[]'
        )`.as('reactions'),
      })
      .from(summary)
      .where(eq(summary.messageId, chatMessages.id))
      .as('message_reaction_list');
  }

  async page(query: HistoryPageQuery): Promise<HistoryRowsPage> {
    // Named per direction, its only structural variant: each connection plans this wide query
    // once and then sends parameters alone, which takes most of its latency away.
    const statement = `history_page_${query.direction}`;
    const rows = await this.rowsQuery(query).prepare(statement).execute();
    const hasMore = rows.length > query.limit;

    const page = rows.slice(0, query.limit);
    const chronological = query.direction === 'before' ? page.reverse() : page;
    return { rows: chronological.map(toHistoryRow), hasMore };
  }
}

function toHistoryRow(
  row: Awaited<ReturnType<DrizzleHistoryRepository['rowsQuery']>>[number],
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
    mentions: row.mentions ?? [],
    reactions: row.reactions ?? [],
  };
}
