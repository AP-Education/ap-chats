import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import { channelMemberships, channels, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ChannelAccessSnapshot } from '../../channels/types/channel-access.types';
import { ChannelAccessRepository } from './channel-access.repository';

@Injectable()
export class DrizzleChannelAccessRepository extends ChannelAccessRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async lockChannel(
    workspaceId: string,
    channelId: string,
    strength: 'update' | 'key share',
  ): Promise<ChannelAccessSnapshot | undefined> {
    const [channel] = await this.txHost.tx
      .select({
        id: channels.id,
        workspaceId: channels.workspaceId,
        kind: channels.kind,
        createdByMemberId: channels.createdByMemberId,
        lastEntrySeq: channels.lastEntrySeq,
      })
      .from(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .for(strength);
    return channel;
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

  async isChannelMember(channelId: string, memberId: string): Promise<boolean> {
    const [row] = await this.txHost.tx
      .select({ memberId: channelMemberships.memberId })
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    return !!row;
  }
}
