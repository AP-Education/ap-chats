import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, ilike, inArray, ne, sql } from 'drizzle-orm';

import {
  channelMemberships,
  messageMentions,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { MentionedMessage } from '../types';
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
    return this.txHost.tx
      .select({
        memberId: workspaceMembers.id,
        displayName: userProfiles.displayName,
        avatarPath: userProfiles.avatarPath,
      })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(channelMemberships.channelId, channelId),
          eq(channelMemberships.workspaceId, workspaceId),
          eq(workspaceMembers.status, 'active'),
          query ? ilike(userProfiles.displayName, `%${escaped}%`) : undefined,
        ),
      )
      .orderBy(userProfiles.displayName)
      .limit(20);
  }

  async allActiveInChannel(
    workspaceId: string,
    channelId: string,
    ids: string[],
  ): Promise<boolean> {
    if (!ids.length) return true;
    const rows = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .innerJoin(channelMemberships, eq(channelMemberships.memberId, workspaceMembers.id))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.status, 'active'),
          eq(channelMemberships.channelId, channelId),
          inArray(workspaceMembers.id, ids),
        ),
      );
    return rows.length === ids.length;
  }

  async replaceDirect(message: MentionedMessage, memberIds: string[]): Promise<void> {
    await this.txHost.tx
      .delete(messageMentions)
      .where(eq(messageMentions.messageId, message.messageId));

    if (memberIds.length)
      await this.txHost.tx.insert(messageMentions).values(
        memberIds.map((memberId) => ({
          workspaceId: message.workspaceId,
          channelId: message.channelId,
          messageId: message.messageId,
          memberId,
          via: 'direct' as const,
        })),
      );
  }

  async addEveryone(message: MentionedMessage): Promise<void> {
    await this.txHost.tx
      .insert(messageMentions)
      .select((qb) =>
        qb
          .select({
            workspaceId: sql`${message.workspaceId}::uuid`.as('workspace_id'),
            channelId: sql`${message.channelId}::uuid`.as('channel_id'),
            messageId: sql`${message.messageId}::uuid`.as('message_id'),
            memberId: channelMemberships.memberId,
            via: sql`'everyone'`.as('via'),
          })
          .from(channelMemberships)
          .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
          .where(
            and(
              eq(channelMemberships.workspaceId, message.workspaceId),
              eq(channelMemberships.channelId, message.channelId),
              eq(workspaceMembers.status, 'active'),
              ne(channelMemberships.memberId, message.authorMemberId),
            ),
          ),
      )
      .onConflictDoNothing();
  }

  async removeForMessages(ids: string[]): Promise<void> {
    if (ids.length)
      await this.txHost.tx.delete(messageMentions).where(inArray(messageMentions.messageId, ids));
  }
}
