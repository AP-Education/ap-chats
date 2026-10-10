import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';

import {
  chatMessages,
  messageReactions,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ReactionState, Reactor } from '../types/reaction.types';
import { ReactionsRepository } from './reactions.repository';

@Injectable()
export class DrizzleReactionsRepository extends ReactionsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async messageIsAvailable(
    workspaceId: string,
    channelId: string,
    messageId: string,
  ): Promise<boolean> {
    const [row] = await this.txHost.tx
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.workspaceId, workspaceId),
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.id, messageId),
          isNull(chatMessages.deletedAt),
        ),
      );
    return !!row;
  }

  async emojis(messageId: string): Promise<string[]> {
    const rows = await this.txHost.tx
      .selectDistinct({ emoji: messageReactions.emoji })
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));
    return rows.map((row) => row.emoji);
  }

  async insert(
    workspaceId: string,
    channelId: string,
    messageId: string,
    emoji: string,
    memberId: string,
  ): Promise<boolean> {
    const rows = await this.txHost.tx
      .insert(messageReactions)
      .values({ workspaceId, channelId, messageId, emoji, memberId })
      .onConflictDoNothing()
      .returning({ memberId: messageReactions.memberId });
    return rows.length > 0;
  }

  async remove(messageId: string, emoji: string, memberId: string): Promise<boolean> {
    const rows = await this.txHost.tx
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.emoji, emoji),
          eq(messageReactions.memberId, memberId),
        ),
      )
      .returning({ memberId: messageReactions.memberId });
    return rows.length > 0;
  }

  async state(messageId: string, emoji: string): Promise<ReactionState> {
    const [row] = await this.txHost.tx
      .select({ count: count(), recentMemberIds: recentMemberIds() })
      .from(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.emoji, emoji)));
    return { emoji, count: row?.count ?? 0, recentMemberIds: row?.recentMemberIds ?? [] };
  }

  reactors(messageId: string, emoji: string | undefined, limit: number): Promise<Reactor[]> {
    return this.txHost.tx
      .select({
        memberId: messageReactions.memberId,
        displayName: userProfiles.displayName,
        avatarPath: userProfiles.avatarPath,
        emoji: messageReactions.emoji,
      })
      .from(messageReactions)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, messageReactions.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          emoji === undefined ? undefined : eq(messageReactions.emoji, emoji),
        ),
      )
      .orderBy(desc(messageReactions.createdAt))
      .limit(limit);
  }
}

/** The latest three reactors of an aggregated group; an empty group yields an empty list. */
export function recentMemberIds() {
  const latest = sql`array_agg(${messageReactions.memberId} order by ${messageReactions.createdAt} desc)`;
  return sql<string[]>`coalesce((${latest})[1:3], '{}')`;
}
