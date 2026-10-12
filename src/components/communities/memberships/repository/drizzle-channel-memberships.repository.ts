import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, exists, inArray, notExists, type SQL, sql, type SQLWrapper } from 'drizzle-orm';

import {
  channelMemberAccess,
  channelMemberships,
  channels,
  roleMembers,
  roles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type {
  ChannelMemberPair,
  ChannelMembership,
  MembershipChanges,
  MembershipScope,
} from '../types';
import { ChannelMembershipsRepository } from './channel-memberships.repository';

@Injectable()
export class DrizzleChannelMembershipsRepository extends ChannelMembershipsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]> {
    // A person's first role in display order that matches, read alongside each membership.
    const topRole = (field: SQLWrapper, condition: SQL) =>
      sql<string | null>`(select ${field} from ${roleMembers}
        join ${roles} on ${roles.id} = ${roleMembers.roleId}
        where ${roleMembers.memberId} = ${channelMemberships.memberId} and ${condition}
        order by ${roles.position}, ${roles.name} limit 1)`;
    const hoistedRoleId = topRole(roles.id, sql`${roles.isHoisted}`);
    const roleColor = topRole(roles.color, sql`${roles.color} is not null`);

    return this.txHost.tx
      .select({
        workspaceId: channelMemberships.workspaceId,
        channelId: channelMemberships.channelId,
        memberId: channelMemberships.memberId,
        joinedAt: channelMemberships.joinedAt,
        hoistedRoleId,
        roleColor,
      })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(workspaceMembers.status, 'active')),
      );
  }

  @Transactional()
  async reconcile(scope: MembershipScope): Promise<MembershipChanges> {
    // Changes to lists and roles are rare, so one workspace at a time keeps them from racing.
    await this.txHost.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${scope.workspaceId}, 0))`,
    );

    const revoked = await this.revokeUnlisted(scope);
    const granted = await this.grantListed(scope);

    return { granted, revoked };
  }

  private revokeUnlisted(scope: MembershipScope): Promise<ChannelMemberPair[]> {
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

  private async grantListed(scope: MembershipScope): Promise<ChannelMemberPair[]> {
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
