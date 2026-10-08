import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, ne, or } from 'drizzle-orm';

import { activeDmPair } from '@/components/communities/channel-access';
import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import {
  calls,
  channelMemberships,
  channels,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';

import { CallPushRepository } from './call-push.repository';

@Injectable()
export class DrizzleCallPushRepository extends CallPushRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }
  async ringingForRecipient(
    workspaceId: string,
    channelId: string,
    callId: string,
    userId: string,
  ): Promise<{ startedAt: Date } | null> {
    const [call] = await this.txHost.tx
      .select({ startedAt: calls.startedAt })
      .from(calls)
      .innerJoin(channels, eq(channels.id, calls.channelId))
      .innerJoin(
        channelMemberships,
        and(
          eq(channelMemberships.channelId, calls.channelId),
          eq(channelMemberships.workspaceId, calls.workspaceId),
        ),
      )
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.id, channelMemberships.memberId),
          eq(workspaceMembers.status, 'active'),
        ),
      )
      .innerJoin(
        userProfiles,
        and(
          eq(userProfiles.id, workspaceMembers.userProfileId),
          eq(userProfiles.oidcUserId, userId),
        ),
      )
      .where(
        and(
          eq(calls.id, callId),
          eq(calls.channelId, channelId),
          eq(calls.workspaceId, workspaceId),
          eq(calls.status, 'ringing'),
          or(ne(channels.kind, 'dm'), activeDmPair(channels.id)),
        ),
      )
      .limit(1);
    return call ?? null;
  }
}
