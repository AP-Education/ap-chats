import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, type SQL, sql, type SQLWrapper } from 'drizzle-orm';

import { activeRoleMembers, channelMemberships, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ChannelMembership } from '../types';
import { ChannelMembershipsRepository } from './channel-memberships.repository';

@Injectable()
export class DrizzleChannelMembershipsRepository extends ChannelMembershipsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]> {
    // A person's first role in display order that matches, read alongside each membership.
    const held = activeRoleMembers;
    const topRole = (field: SQLWrapper, condition: SQL) =>
      sql<string | null>`(select ${field} from ${held}
        where ${held.memberId} = ${channelMemberships.memberId} and ${condition}
        order by ${held.position}, ${held.name} limit 1)`;
    const hoistedRoleId = topRole(held.roleId, sql`${held.isHoisted}`);
    const roleColor = topRole(held.color, sql`${held.color} is not null`);

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
}
