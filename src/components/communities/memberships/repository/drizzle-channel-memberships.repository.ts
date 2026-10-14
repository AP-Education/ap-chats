import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import {
  channelMemberships,
  memberRolePresentation,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ChannelMembership } from '../types';
import { ChannelMembershipsRepository } from './channel-memberships.repository';

@Injectable()
export class DrizzleChannelMembershipsRepository extends ChannelMembershipsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]> {
    return this.txHost.tx
      .select({
        workspaceId: channelMemberships.workspaceId,
        channelId: channelMemberships.channelId,
        memberId: channelMemberships.memberId,
        joinedAt: channelMemberships.joinedAt,
        hoistedRoleId: memberRolePresentation.hoistedRoleId,
        roleColor: memberRolePresentation.roleColor,
      })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .leftJoin(
        memberRolePresentation,
        eq(memberRolePresentation.memberId, channelMemberships.memberId),
      )
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(workspaceMembers.status, 'active')),
      );
  }
}
