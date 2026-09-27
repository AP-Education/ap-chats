import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray } from 'drizzle-orm';

import { channelMemberships, messageMentions, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import { MentionsRepository } from './mentions.repository';

@Injectable()
export class DrizzleMentionsRepository extends MentionsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
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
    await this.txHost.tx.delete(messageMentions).where(eq(messageMentions.messageId, messageId));
    if (ids.length)
      await this.txHost.tx
        .insert(messageMentions)
        .values(ids.map((memberId) => ({ workspaceId, channelId, messageId, memberId })));
  }

  async removeForMessages(ids: string[]): Promise<void> {
    if (ids.length)
      await this.txHost.tx.delete(messageMentions).where(inArray(messageMentions.messageId, ids));
  }
}
