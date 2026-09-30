import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray } from 'drizzle-orm';

import { channelMemberships, userProfiles, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import { ChannelAudienceRepository } from './channel-audience.repository';

@Injectable()
export class DrizzleChannelAudienceRepository extends ChannelAudienceRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async allowedUserIds(
    workspaceId: string,
    channelId: string,
    candidateUserIds: string[],
  ): Promise<string[]> {
    if (!candidateUserIds.length) return [];
    const rows = await this.txHost.tx
      .select({ userId: userProfiles.oidcUserId })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(channelMemberships.channelId, channelId),
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.status, 'active'),
          inArray(userProfiles.oidcUserId, candidateUserIds),
        ),
      );
    return rows.map(({ userId }) => userId);
  }
}
