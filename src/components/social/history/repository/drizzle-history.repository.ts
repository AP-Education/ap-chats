import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, desc, eq, gt, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  calls,
  channelEntries,
  chatMessages,
  memberRolePresentation,
  messageContext,
  messageMentions,
  messagePins,
  messageReactions,
  messageReactionSummaries,
  messageRoleMentions,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { MessageReaction } from '../../reactions/types/reaction.types';
import type {
  ContextPreview,
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
    // Technical debt: a direct conversation still lives in a workspace (direct_messages.workspace_id),
    // so its two people come with that workspace's roles, though it belongs to them, not to it.
    const authorRoles = alias(memberRolePresentation, 'author_roles');
    const replyAuthorRoles = alias(memberRolePresentation, 'reply_author_roles');
    const forwardAuthorRoles = alias(memberRolePresentation, 'forward_author_roles');
    const startedByRoles = alias(memberRolePresentation, 'started_by_roles');
    const mentions = this.mentionsOfMessage();
    const context = this.contextOfMessage();
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
        authorProfile: {
          displayName: authors.displayName,
          avatarPath: authors.avatarPath,
          // Joined beside the role colour, so a missing person reads as no bot.
          isBot: sql<boolean>`coalesce(${authors.isBot}, false)`,
          roleColor: authorRoles.roleColor,
        },
        reply: {
          id: replyMessages.id,
          authorMemberId: replyMessages.authorMemberId,
          contentMarkdown: replyMessages.contentMarkdown,
          gif: replyMessages.gif,
          deletedAt: replyMessages.deletedAt,
        },
        replyAuthorProfile: {
          displayName: replyAuthors.displayName,
          avatarPath: replyAuthors.avatarPath,
          isBot: sql<boolean>`coalesce(${replyAuthors.isBot}, false)`,
          roleColor: replyAuthorRoles.roleColor,
        },
        context: context.context,
        forwardAuthorProfile: {
          displayName: forwardAuthors.displayName,
          avatarPath: forwardAuthors.avatarPath,
          isBot: sql<boolean>`coalesce(${forwardAuthors.isBot}, false)`,
          roleColor: forwardAuthorRoles.roleColor,
        },
        pin: messagePins,
        mentions: mentions.mentions,
        mentionsViewer: this.viewerMentioned(viewerMemberId),
        rolesMentioningViewer: this.rolesMentioningViewer(viewerMemberId),
        reactions: reactions.reactions,
        call: calls,
        startedByProfile: {
          displayName: startedByProfiles.displayName,
          avatarPath: startedByProfiles.avatarPath,
          isBot: sql<boolean>`coalesce(${startedByProfiles.isBot}, false)`,
          roleColor: startedByRoles.roleColor,
        },
      })
      .from(channelEntries)
      .leftJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .leftJoin(authorMembers, eq(authorMembers.id, chatMessages.authorMemberId))
      .leftJoin(authors, eq(authors.id, authorMembers.userProfileId))
      .leftJoin(authorRoles, eq(authorRoles.memberId, chatMessages.authorMemberId))
      .leftJoin(replyMessages, eq(replyMessages.id, chatMessages.replyToMessageId))
      .leftJoin(replyAuthorMembers, eq(replyAuthorMembers.id, replyMessages.authorMemberId))
      .leftJoin(replyAuthors, eq(replyAuthors.id, replyAuthorMembers.userProfileId))
      .leftJoin(replyAuthorRoles, eq(replyAuthorRoles.memberId, replyMessages.authorMemberId))
      .leftJoin(
        forwardAuthorMembers,
        eq(forwardAuthorMembers.id, chatMessages.forwardedFromMemberId),
      )
      .leftJoin(forwardAuthors, eq(forwardAuthors.id, forwardAuthorMembers.userProfileId))
      .leftJoin(
        forwardAuthorRoles,
        eq(forwardAuthorRoles.memberId, chatMessages.forwardedFromMemberId),
      )
      .leftJoin(
        messagePins,
        and(
          eq(messagePins.channelId, channelEntries.channelId),
          eq(messagePins.messageId, channelEntries.messageId),
        ),
      )
      .leftJoinLateral(mentions, sql`true`)
      .leftJoinLateral(context, sql`true`)
      .leftJoinLateral(reactions, sql`true`)
      .leftJoin(calls, eq(calls.id, channelEntries.callId))
      .leftJoin(startedByMembers, eq(startedByMembers.id, calls.startedByMemberId))
      .leftJoin(startedByProfiles, eq(startedByProfiles.id, startedByMembers.userProfileId))
      .leftJoin(startedByRoles, eq(startedByRoles.memberId, calls.startedByMemberId))
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
      'avatarPath', ${userProfiles.avatarPath},
      'isBot', ${userProfiles.isBot}
    )`;

    return (
      this.txHost.tx
        .select({ mentions: sql<Mention[]>`coalesce(json_agg(${mention}), '[]')`.as('mentions') })
        .from(messageMentions)
        .innerJoin(workspaceMembers, eq(workspaceMembers.id, messageMentions.memberId))
        .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
        // @everyone fans out to the whole channel; only members named in the text become tags.
        .where(
          and(eq(messageMentions.messageId, chatMessages.id), eq(messageMentions.via, 'direct')),
        )
        .as('message_mention_list')
    );
  }

  // The first live message it is about, and how many there are, counted before the limit.
  private contextOfMessage() {
    const contextMessages = alias(chatMessages, 'context_messages');
    const contextEntries = alias(channelEntries, 'context_entries');
    const preview = sql<ContextPreview>`json_build_object(
      'count', count(*) over (),
      'first', json_build_object(
        'id', ${contextMessages.id},
        'authorMemberId', ${contextMessages.authorMemberId},
        'contentMarkdown', ${contextMessages.contentMarkdown},
        'gif', ${contextMessages.gif},
        'author', json_build_object(
          'displayName', ${userProfiles.displayName},
          'avatarPath', ${userProfiles.avatarPath},
          'isBot', ${userProfiles.isBot},
          'roleColor', ${memberRolePresentation.roleColor}
        )
      )
    )`;

    return this.txHost.tx
      .select({ context: preview.as('context') })
      .from(messageContext)
      .innerJoin(contextMessages, eq(contextMessages.id, messageContext.contextMessageId))
      .innerJoin(contextEntries, eq(contextEntries.messageId, contextMessages.id))
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, contextMessages.authorMemberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .leftJoin(
        memberRolePresentation,
        eq(memberRolePresentation.memberId, contextMessages.authorMemberId),
      )
      .where(and(eq(messageContext.messageId, chatMessages.id), isNull(contextMessages.deletedAt)))
      .orderBy(asc(contextEntries.seq))
      .limit(1)
      .as('message_context_preview');
  }

  // Reached through @everyone the viewer is not among the tags, so it is asked on its own.
  private viewerMentioned(viewerMemberId: string) {
    return sql<boolean>`exists (
      select 1 from ${messageMentions}
      where ${messageMentions.messageId} = ${chatMessages.id}
        and ${messageMentions.memberId} = ${viewerMemberId}
    )`;
  }

  private rolesMentioningViewer(viewerMemberId: string) {
    return sql<string[]>`coalesce((
      select array_agg(${messageRoleMentions.roleId}::text) from ${messageRoleMentions}
      where ${messageRoleMentions.messageId} = ${chatMessages.id}
        and ${messageRoleMentions.memberId} = ${viewerMemberId}
    ), '{}')`;
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
    context: row.context ?? null,
    forwardAuthorProfile: row.forwardAuthorProfile,
    pin: row.pin,
    mentions: row.mentions ?? [],
    mentionsViewer: row.mentionsViewer,
    rolesMentioningViewer: row.rolesMentioningViewer ?? [],
    reactions: row.reactions ?? [],
  };
}
