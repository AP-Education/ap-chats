import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  ne,
  notInArray,
  or,
  type SQL,
} from 'drizzle-orm';

import {
  channelMemberships,
  channels,
  messageMentions,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import { MentionsRepository } from './mentions.repository';

@Injectable()
export class DrizzleMentionsRepository extends MentionsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async mentionedMemberIds(messageIds: string[]): Promise<string[]> {
    if (!messageIds.length) return [];
    const rows = await this.txHost.tx
      .selectDistinct({ memberId: messageMentions.memberId })
      .from(messageMentions)
      .where(inArray(messageMentions.messageId, messageIds));
    return rows.map((row) => row.memberId);
  }

  async candidates(workspaceId: string, channelId: string, query: string) {
    const escaped = query.replace(/[\\%_]/gu, '\\$&');
    return this.mentionable(
      workspaceId,
      channelId,
      query ? ilike(userProfiles.displayName, `%${escaped}%`) : undefined,
    )
      .orderBy(desc(userProfiles.isBot), userProfiles.displayName)
      .limit(20);
  }

  async allActiveInChannel(
    workspaceId: string,
    channelId: string,
    ids: string[],
  ): Promise<boolean> {
    if (!ids.length) return true;
    const rows = await this.mentionable(workspaceId, channelId, inArray(workspaceMembers.id, ids));
    return rows.length === ids.length;
  }

  // The channel's members, and the workspace's bots in any channel but a direct message: a
  // mention summons a bot, which joins when it answers.
  private mentionable(workspaceId: string, channelId: string, condition: SQL | undefined) {
    return this.txHost.tx
      .select({
        memberId: workspaceMembers.id,
        displayName: userProfiles.displayName,
        avatarPath: userProfiles.avatarPath,
        isBot: userProfiles.isBot,
      })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .innerJoin(channels, and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .leftJoin(
        channelMemberships,
        and(
          eq(channelMemberships.channelId, channelId),
          eq(channelMemberships.memberId, workspaceMembers.id),
        ),
      )
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.status, 'active'),
          or(
            isNotNull(channelMemberships.memberId),
            and(eq(userProfiles.isBot, true), ne(channels.kind, 'dm')),
          ),
          condition,
        ),
      )
      .$dynamic();
  }

  async replace(
    workspaceId: string,
    channelId: string,
    messageId: string,
    ids: string[],
  ): Promise<void> {
    await this.txHost.tx
      .delete(messageMentions)
      .where(
        and(
          eq(messageMentions.messageId, messageId),
          ids.length ? notInArray(messageMentions.memberId, ids) : undefined,
        ),
      );
    if (ids.length)
      await this.txHost.tx
        .insert(messageMentions)
        .values(ids.map((memberId) => ({ workspaceId, channelId, messageId, memberId })))
        .onConflictDoNothing();
  }

  async removeForMessages(ids: string[]): Promise<void> {
    if (ids.length)
      await this.txHost.tx.delete(messageMentions).where(inArray(messageMentions.messageId, ids));
  }
}
