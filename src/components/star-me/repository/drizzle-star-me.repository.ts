import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, desc, eq, inArray, isNull, lt, lte, type SQL, sql } from 'drizzle-orm';

import type { MemberSummary } from '@/components/workspaces/members/types';
import {
  channelEntries,
  chatMessages,
  messageMentions,
  starMeQuestionMessages,
  userProfiles,
  workspaceMembers,
  workspaces,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { BotIdentity } from '../star-me.identity';
import type { ConversationMessage, Question } from '../types';
import { StarMeRepository } from './star-me.repository';

@Injectable()
export class DrizzleStarMeRepository extends StarMeRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async saveIdentity({ subject, displayName, avatarPath }: BotIdentity): Promise<void> {
    await this.txHost.tx
      .insert(userProfiles)
      .values({ oidcUserId: subject, displayName, avatarPath, isBot: true })
      .onConflictDoUpdate({
        target: userProfiles.oidcUserId,
        set: { displayName, avatarPath, isBot: true },
      });
  }

  async enrol({ subject }: BotIdentity, workspaceId?: string): Promise<void> {
    const [profile] = await this.txHost.tx
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.oidcUserId, subject));
    if (!profile) return;

    const targets = await this.txHost.tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(workspaceId ? eq(workspaces.id, workspaceId) : undefined);
    if (!targets.length) return;

    await this.txHost.tx
      .insert(workspaceMembers)
      .values(targets.map(({ id }) => ({ workspaceId: id, userProfileId: profile.id })))
      .onConflictDoNothing();
  }

  async question(
    askedByMemberId: string,
    channelId: string,
    messageId: string,
    starMeMemberId: string,
  ): Promise<Question | undefined> {
    const [row] = await this.txHost.tx
      .select({
        id: chatMessages.id,
        workspaceId: chatMessages.workspaceId,
        channelId: chatMessages.channelId,
        seq: channelEntries.seq,
        replyToMessageId: chatMessages.replyToMessageId,
      })
      .from(chatMessages)
      .innerJoin(channelEntries, eq(channelEntries.messageId, chatMessages.id))
      .where(
        and(
          eq(chatMessages.id, messageId),
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.authorMemberId, askedByMemberId),
          isNull(chatMessages.deletedAt),
        ),
      );
    if (!row) return undefined;

    const [mention] = await this.txHost.tx
      .select({ memberId: messageMentions.memberId })
      .from(messageMentions)
      .where(
        and(eq(messageMentions.messageId, messageId), eq(messageMentions.memberId, starMeMemberId)),
      );

    const [repliedAnswer] = row.replyToMessageId
      ? await this.txHost.tx
          .select({ id: chatMessages.id })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.id, row.replyToMessageId),
              eq(chatMessages.authorMemberId, starMeMemberId),
            ),
          )
      : [];

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      channelId: row.channelId,
      seq: row.seq,
      mentionsStarMe: Boolean(mention),
      repliesToStarMe: Boolean(repliedAnswer),
    };
  }

  async answerId(channelId: string, starMeMemberId: string, clientNonce: string) {
    const [row] = await this.txHost.tx
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.authorMemberId, starMeMemberId),
          eq(chatMessages.clientNonce, clientNonce),
        ),
      );
    return row?.id;
  }

  async recent(channelId: string, seq: bigint, limit: number): Promise<ConversationMessage[]> {
    const rows = await this.messages(
      and(eq(chatMessages.channelId, channelId), lte(channelEntries.seq, seq)),
    )
      .orderBy(desc(channelEntries.seq))
      .limit(limit);
    return this.withMentions(rows.reverse());
  }

  async selected(channelId: string, messageIds: string[]): Promise<ConversationMessage[]> {
    if (!messageIds.length) return [];
    const rows = await this.messages(
      and(eq(chatMessages.channelId, channelId), inArray(chatMessages.id, messageIds)),
    ).orderBy(asc(channelEntries.seq));
    return this.withMentions(rows);
  }

  async pick(question: Question, messageIds: string[]): Promise<void> {
    const earlier = this.txHost.tx
      .select({
        workspaceId: chatMessages.workspaceId,
        channelId: chatMessages.channelId,
        questionId: sql<string>`${question.id}::uuid`.as('question_id'),
        messageId: chatMessages.id,
      })
      .from(chatMessages)
      .innerJoin(channelEntries, eq(channelEntries.messageId, chatMessages.id))
      .where(
        and(
          eq(chatMessages.channelId, question.channelId),
          inArray(chatMessages.id, messageIds),
          lt(channelEntries.seq, question.seq),
        ),
      );
    await this.txHost.tx.insert(starMeQuestionMessages).select(earlier).onConflictDoNothing();
  }

  async picked(channelId: string, questionId: string): Promise<ConversationMessage[]> {
    const pickedIds = this.txHost.tx
      .select({ id: starMeQuestionMessages.messageId })
      .from(starMeQuestionMessages)
      .where(eq(starMeQuestionMessages.questionId, questionId));
    const rows = await this.messages(
      and(eq(chatMessages.channelId, channelId), inArray(chatMessages.id, pickedIds)),
    ).orderBy(asc(channelEntries.seq));
    return this.withMentions(rows);
  }

  private messages(condition: SQL | undefined) {
    return this.txHost.tx
      .select({
        id: chatMessages.id,
        seq: channelEntries.seq,
        markdown: chatMessages.contentMarkdown,
        createdAt: chatMessages.createdAt,
        author: {
          memberId: workspaceMembers.id,
          displayName: userProfiles.displayName,
          avatarPath: userProfiles.avatarPath,
          isBot: userProfiles.isBot,
        },
      })
      .from(chatMessages)
      .innerJoin(channelEntries, eq(channelEntries.messageId, chatMessages.id))
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, chatMessages.authorMemberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(and(condition, isNull(chatMessages.deletedAt)))
      .$dynamic();
  }

  private async withMentions(
    rows: Omit<ConversationMessage, 'mentions'>[],
  ): Promise<ConversationMessage[]> {
    if (!rows.length) return [];
    const mentions = await this.txHost.tx
      .select({
        messageId: messageMentions.messageId,
        memberId: workspaceMembers.id,
        displayName: userProfiles.displayName,
        avatarPath: userProfiles.avatarPath,
        isBot: userProfiles.isBot,
      })
      .from(messageMentions)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, messageMentions.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        inArray(
          messageMentions.messageId,
          rows.map((row) => row.id),
        ),
      );

    const byMessage = new Map<string, MemberSummary[]>();
    for (const { messageId, ...member } of mentions) {
      byMessage.set(messageId, [...(byMessage.get(messageId) ?? []), member]);
    }
    return rows.map((row) => ({ ...row, mentions: byMessage.get(row.id) ?? [] }));
  }
}
