import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  channelEntries,
  chatMessages,
  messageMentions,
  messagePins,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { HistoryRowsPage } from '../types/history.types';
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

  async firstUnreadSeq(
    channelId: string,
    memberId: string,
    after: bigint,
    ceiling: bigint,
  ): Promise<bigint | null> {
    const [row] = await this.txHost.tx
      .select({ seq: channelEntries.seq })
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
      )
      .orderBy(asc(channelEntries.seq))
      .limit(1);
    return row?.seq ?? null;
  }

  async page(
    channelId: string,
    direction: 'before' | 'after',
    cursor: bigint | undefined,
    ceiling: bigint,
    limit: number,
  ): Promise<HistoryRowsPage> {
    const replyMessages = alias(chatMessages, 'reply_messages');
    const authorMembers = alias(workspaceMembers, 'author_members');
    const replyAuthorMembers = alias(workspaceMembers, 'reply_author_members');
    const forwardAuthorMembers = alias(workspaceMembers, 'forward_author_members');
    const authors = alias(userProfiles, 'authors');
    const replyAuthors = alias(userProfiles, 'reply_authors');
    const forwardAuthors = alias(userProfiles, 'forward_authors');
    const rows = await this.txHost.tx
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
      })
      .from(channelEntries)
      .innerJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .innerJoin(authorMembers, eq(authorMembers.id, chatMessages.authorMemberId))
      .innerJoin(authors, eq(authors.id, authorMembers.userProfileId))
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
    const ids = page.map((row) => row.message.id);
    const mentions = ids.length
      ? await this.txHost.tx
          .select({
            messageId: messageMentions.messageId,
            memberId: workspaceMembers.id,
            displayName: userProfiles.displayName,
            avatarPath: userProfiles.avatarPath,
          })
          .from(messageMentions)
          .innerJoin(workspaceMembers, eq(workspaceMembers.id, messageMentions.memberId))
          .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
          .where(inArray(messageMentions.messageId, ids))
      : [];
    const byMessage = new Map<string, typeof mentions>();
    for (const mention of mentions)
      byMessage.set(mention.messageId, [...(byMessage.get(mention.messageId) ?? []), mention]);
    return {
      rows: (direction === 'before' ? page.reverse() : page).map((row) => ({
        ...row,
        mentions: (byMessage.get(row.message.id) ?? []).map(
          ({ memberId, displayName, avatarPath }) => ({ memberId, displayName, avatarPath }),
        ),
      })),
      hasMore,
    };
  }
}
