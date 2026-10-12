import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, sql } from 'drizzle-orm';

import {
  channelMemberAccess,
  channelMemberships,
  channels,
  directMessages,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ChannelAccessSnapshot } from '../../channels/types/channel-access.types';
import { ChannelAccessRepository } from './channel-access.repository';

@Injectable()
export class DrizzleChannelAccessRepository extends ChannelAccessRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findParticipation(
    workspaceId: string,
    channelId: string,
    memberId: string,
    lock?: 'update' | 'key share',
  ): Promise<ChannelAccessSnapshot | undefined> {
    // Both people of a direct conversation may post; it has no lists to say otherwise.
    const canPost = sql<boolean>`coalesce(${channelMemberAccess.canPost}, ${channels.kind} = 'dm')`;
    const canManage = sql<boolean>`coalesce(${channelMemberAccess.canManage}, false)`;

    const query = this.txHost.tx
      .select({
        id: channels.id,
        workspaceId: channels.workspaceId,
        kind: channels.kind,
        lastEntrySeq: channels.lastEntrySeq,
        canPost,
        canManage,
      })
      .from(channels)
      .innerJoin(
        channelMemberships,
        and(
          eq(channelMemberships.channelId, channels.id),
          eq(channelMemberships.memberId, memberId),
        ),
      )
      .leftJoin(
        channelMemberAccess,
        and(
          eq(channelMemberAccess.channelId, channels.id),
          eq(channelMemberAccess.memberId, memberId),
        ),
      )
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .$dynamic();

    const [participation] = await (lock ? query.for(lock, { of: channels }) : query);
    return participation;
  }

  async isActiveWorkspaceMember(workspaceId: string, memberId: string): Promise<boolean> {
    const [row] = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.status, 'active'),
        ),
      )
      .for('share');
    return !!row;
  }

  async isDmPeerActive(channelId: string, memberId: string): Promise<boolean> {
    const [pair] = await this.txHost.tx
      .select({ first: directMessages.firstMemberId, second: directMessages.secondMemberId })
      .from(directMessages)
      .where(eq(directMessages.channelId, channelId));
    if (!pair || (pair.first !== memberId && pair.second !== memberId)) return false;
    const other = pair.first === memberId ? pair.second : pair.first;
    const [peer] = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, other), eq(workspaceMembers.status, 'active')))
      .for('share');
    return !!peer;
  }
}
