import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, ilike, inArray, notInArray } from 'drizzle-orm';

import {
  channelMemberships,
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
