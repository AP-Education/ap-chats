import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { DrizzleService } from '@/database/drizzle';
import { channelMemberships, userProfiles, workspaceMembers } from '@/database/drizzle/schema';

import { ChannelAudienceRepository } from './channel-audience.repository';

@Injectable()
export class DrizzleChannelAudienceRepository extends ChannelAudienceRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async allowedUserIds(
    workspaceId: string,
    channelId: string,
    candidateUserIds: string[],
  ): Promise<string[]> {
    if (!candidateUserIds.length) return [];
    const rows = await this.drizzle.db
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
