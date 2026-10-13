import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import {
  channelMemberships,
  channels,
  directMessages,
  workspaceMembers,
} from '@/database/drizzle/schema';

import type { MemberPair } from '../types';
import { DirectConversationsRepository } from './direct-conversations.repository';

@Injectable()
export class DrizzleDirectConversationsRepository extends DirectConversationsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async isActiveMember(workspaceId: string, memberId: string): Promise<boolean> {
    const [row] = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
    return row !== undefined;
  }

  async lockPair({ workspaceId, firstMemberId, secondMemberId }: MemberPair): Promise<void> {
    const key = `direct-messages:${workspaceId}:${firstMemberId}:${secondMemberId}`;
    await this.txHost.tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
  }

  async findPair({ workspaceId, firstMemberId, secondMemberId }: MemberPair) {
    const [row] = await this.txHost.tx
      .select({ channelId: directMessages.channelId })
      .from(directMessages)
      .where(
        and(
          eq(directMessages.workspaceId, workspaceId),
          eq(directMessages.firstMemberId, firstMemberId),
          eq(directMessages.secondMemberId, secondMemberId),
        ),
      );
    return row?.channelId;
  }

  async createPair(pair: MemberPair, creatorMemberId: string): Promise<string> {
    const { workspaceId, firstMemberId, secondMemberId } = pair;
    const [channel] = await this.txHost.tx
      .insert(channels)
      .values({
        workspaceId,
        kind: 'dm',
        name: null,
        categoryId: null,
        createdByMemberId: creatorMemberId,
      })
      .returning({ id: channels.id });
    if (!channel) throw new Error('Direct message insert failed');

    await this.txHost.tx
      .insert(directMessages)
      .values({ workspaceId, channelId: channel.id, firstMemberId, secondMemberId });
    await this.txHost.tx.insert(channelMemberships).values([
      { workspaceId, channelId: channel.id, memberId: firstMemberId },
      { workspaceId, channelId: channel.id, memberId: secondMemberId },
    ]);
    return channel.id;
  }

  async findShared(member: WorkspaceMember, targetMemberId: string) {
    const [target] = await this.txHost.tx
      .select({ userProfileId: workspaceMembers.userProfileId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, member.workspaceId),
          eq(workspaceMembers.id, targetMemberId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
    if (!target) return undefined;

    const people = [member.userProfileId, target.userProfileId];
    const first = alias(workspaceMembers, 'dm_shared_first');
    const second = alias(workspaceMembers, 'dm_shared_second');
    const [shared] = await this.txHost.tx
      .select({ channelId: directMessages.channelId })
      .from(directMessages)
      .innerJoin(channels, eq(channels.id, directMessages.channelId))
      .innerJoin(first, eq(first.id, directMessages.firstMemberId))
      .innerJoin(second, eq(second.id, directMessages.secondMemberId))
      .where(
        and(
          inArray(first.userProfileId, people),
          eq(first.status, 'active'),
          inArray(second.userProfileId, people),
          eq(second.status, 'active'),
        ),
      )
      .orderBy(
        sql`${directMessages.workspaceId} = ${member.workspaceId} desc`,
        desc(channels.updatedAt),
      )
      .limit(1);
    return shared?.channelId;
  }
}
