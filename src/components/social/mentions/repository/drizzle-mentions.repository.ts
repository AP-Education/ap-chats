import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, ilike, inArray, isNotNull, ne, or, type SQL, sql } from 'drizzle-orm';

import {
  activeRoleMembers,
  channelMemberships,
  channels,
  messageMentions,
  messageRoleMentions,
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

  // The channel's members, and the workspace's bots in any channel but a direct message.
  // Tech debt: a bot answers on the asker's right to post rather than its own channel grants,
  // so it is mentionable where the lists leave it out; drop this once bots hold grants.
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

  async addRoles(message: MentionedMessage, roleIds: string[]): Promise<void> {
    if (!roleIds.length) return;
    const reached = this.txHost.tx
      .select({ memberId: activeRoleMembers.memberId, roleId: activeRoleMembers.roleId })
      .from(activeRoleMembers)
      .innerJoin(
        channelMemberships,
        and(
          eq(channelMemberships.memberId, activeRoleMembers.memberId),
          eq(channelMemberships.channelId, message.channelId),
        ),
      )
      .where(
        and(
          eq(activeRoleMembers.workspaceId, message.workspaceId),
          inArray(activeRoleMembers.roleId, roleIds),
          ne(activeRoleMembers.memberId, message.authorMemberId),
        ),
      )
      .as('reached');
    const messageId = sql`${message.messageId}::uuid`.as('message_id');

    await this.txHost.tx
      .insert(messageMentions)
      .select((qb) =>
        qb
          .selectDistinct({
            workspaceId: sql`${message.workspaceId}::uuid`.as('workspace_id'),
            channelId: sql`${message.channelId}::uuid`.as('channel_id'),
            messageId,
            memberId: reached.memberId,
            via: sql`'role'`.as('via'),
          })
          .from(reached),
      )
      .onConflictDoNothing();
    await this.txHost.tx
      .insert(messageRoleMentions)
      .select((qb) =>
        qb.select({ messageId, memberId: reached.memberId, roleId: reached.roleId }).from(reached),
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
