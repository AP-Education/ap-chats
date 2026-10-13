import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, exists, inArray, notExists, sql } from 'drizzle-orm';

import { channelMemberAccess, channelMemberships, channels } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ChannelMemberPair, ParticipationChanges, ParticipationScope } from '../types';
import { ParticipationRepository } from './participation.repository';

@Injectable()
export class DrizzleParticipationRepository extends ParticipationRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  @Transactional()
  async reconcile(scope: ParticipationScope): Promise<ParticipationChanges> {
    // Changes to lists and roles are rare, so one workspace at a time keeps them from racing.
    await this.txHost.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${scope.workspaceId}, 0))`,
    );

    const revoked = await this.revokeUnlisted(scope);
    const granted = await this.grantListed(scope);

    return { granted, revoked };
  }

  participants(workspaceId: string, channelId: string): Promise<ChannelMemberPair[]> {
    return this.txHost.tx
      .select({ channelId: channelMemberships.channelId, memberId: channelMemberships.memberId })
      .from(channelMemberships)
      .where(
        and(
          eq(channelMemberships.workspaceId, workspaceId),
          eq(channelMemberships.channelId, channelId),
        ),
      );
  }

  private revokeUnlisted(scope: ParticipationScope): Promise<ChannelMemberPair[]> {
    const inScope =
      'channelIds' in scope
        ? inArray(channelMemberships.channelId, scope.channelIds)
        : inArray(channelMemberships.memberId, scope.memberIds);
    const isNamedChannel = exists(
      this.txHost.tx
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.id, channelMemberships.channelId), eq(channels.kind, 'channel'))),
    );
    const isNoLongerListed = notExists(
      this.txHost.tx
        .select({ memberId: channelMemberAccess.memberId })
        .from(channelMemberAccess)
        .where(
          and(
            eq(channelMemberAccess.channelId, channelMemberships.channelId),
            eq(channelMemberAccess.memberId, channelMemberships.memberId),
          ),
        ),
    );

    return this.txHost.tx
      .delete(channelMemberships)
      .where(
        and(
          eq(channelMemberships.workspaceId, scope.workspaceId),
          inScope,
          isNamedChannel,
          isNoLongerListed,
        ),
      )
      .returning({
        channelId: channelMemberships.channelId,
        memberId: channelMemberships.memberId,
      });
  }

  private async grantListed(scope: ParticipationScope): Promise<ChannelMemberPair[]> {
    const inScope =
      'channelIds' in scope
        ? inArray(channelMemberAccess.channelId, scope.channelIds)
        : inArray(channelMemberAccess.memberId, scope.memberIds);
    // A newcomer sees the history but none of it as unread.
    const listed = this.txHost.tx
      .select({
        workspaceId: channelMemberAccess.workspaceId,
        channelId: channelMemberAccess.channelId,
        memberId: channelMemberAccess.memberId,
        lastReadEntrySeq: channels.lastEntrySeq,
      })
      .from(channelMemberAccess)
      .innerJoin(channels, eq(channels.id, channelMemberAccess.channelId))
      .where(and(eq(channelMemberAccess.workspaceId, scope.workspaceId), inScope));

    const { rows } = await this.txHost.tx.execute<{ channelId: string; memberId: string }>(sql`
      insert into ${channelMemberships} (workspace_id, channel_id, member_id, last_read_entry_seq)
      ${listed}
      on conflict (channel_id, member_id) do nothing
      returning channel_id as "channelId", member_id as "memberId"
    `);
    return rows;
  }
}
