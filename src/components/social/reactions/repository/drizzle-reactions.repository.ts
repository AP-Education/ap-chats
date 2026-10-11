import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, isNull } from 'drizzle-orm';

import {
  chatMessages,
  messageReactions,
  messageReactionSummaries,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ReactedMessage, ReactionSummary, Reactor } from '../types/reaction.types';
import { ReactionsRepository } from './reactions.repository';

@Injectable()
export class DrizzleReactionsRepository extends ReactionsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async isLiveMessage({ workspaceId, channelId, messageId }: ReactedMessage): Promise<boolean> {
    const [message] = await this.txHost.tx
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
    return message !== undefined;
  }

  async emojisOn(messageId: string): Promise<string[]> {
    const summaries = await this.txHost.tx
      .select({ emoji: messageReactionSummaries.emoji })
      .from(messageReactionSummaries)
      .where(eq(messageReactionSummaries.messageId, messageId));
    return summaries.map((summary) => summary.emoji);
  }

  async add(message: ReactedMessage, emoji: string, memberId: string): Promise<boolean> {
    const added = await this.txHost.tx
      .insert(messageReactions)
      .values({ ...message, emoji, memberId })
      .onConflictDoNothing()
      .returning({ memberId: messageReactions.memberId });
    return added.length > 0;
  }

  async remove(messageId: string, emoji: string, memberId: string): Promise<boolean> {
    const removed = await this.txHost.tx
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.emoji, emoji),
          eq(messageReactions.memberId, memberId),
        ),
      )
      .returning({ memberId: messageReactions.memberId });
    return removed.length > 0;
  }

  async summary(messageId: string, emoji: string): Promise<ReactionSummary> {
    const [summary] = await this.txHost.tx
      .select({
        emoji: messageReactionSummaries.emoji,
        count: messageReactionSummaries.count,
        recentMemberIds: messageReactionSummaries.recentMemberIds,
      })
      .from(messageReactionSummaries)
      .where(
        and(
          eq(messageReactionSummaries.messageId, messageId),
          eq(messageReactionSummaries.emoji, emoji),
        ),
      );
    return summary ?? { emoji, count: 0, recentMemberIds: [] };
  }

  reactors(
    messageId: string,
    { emoji, limit }: { emoji: string | undefined; limit: number },
  ): Promise<Reactor[]> {
    const ofEmoji = emoji === undefined ? undefined : eq(messageReactions.emoji, emoji);

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
      .where(and(eq(messageReactions.messageId, messageId), ofEmoji))
      .orderBy(desc(messageReactions.createdAt))
      .limit(limit);
  }
}
