import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, lt, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { calls, directMessages, userProfiles, workspaceMembers } from '@/database/drizzle/schema';

import type { CallHistoryEntry, CallHistoryFilter } from '../types';
import { CallsHistoryRepository } from './calls-history.repository';

@Injectable()
export class DrizzleCallsHistoryRepository extends CallsHistoryRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async listForUser(
    userId: string,
    filter: CallHistoryFilter,
    cursor: { startedAt: Date; id: string } | undefined,
    limit: number,
  ): Promise<CallHistoryEntry[]> {
    const viewer = alias(workspaceMembers, 'call_history_viewer');
    const viewerProfile = alias(userProfiles, 'call_history_viewer_profile');
    const first = alias(workspaceMembers, 'call_history_first');
    const second = alias(workspaceMembers, 'call_history_second');
    const firstProfile = alias(userProfiles, 'call_history_first_profile');
    const secondProfile = alias(userProfiles, 'call_history_second_profile');
    const rows = await this.txHost.tx
      .select({
        call: calls,
        viewerId: viewer.id,
        first: {
          id: first.id,
          status: first.status,
          displayName: firstProfile.displayName,
          avatarPath: firstProfile.avatarPath,
        },
        second: {
          id: second.id,
          status: second.status,
          displayName: secondProfile.displayName,
          avatarPath: secondProfile.avatarPath,
        },
      })
      .from(calls)
      .innerJoin(directMessages, eq(directMessages.channelId, calls.channelId))
      .innerJoin(
        viewer,
        or(
          eq(viewer.id, directMessages.firstMemberId),
          eq(viewer.id, directMessages.secondMemberId),
        ),
      )
      .innerJoin(viewerProfile, eq(viewerProfile.id, viewer.userProfileId))
      .innerJoin(first, eq(first.id, directMessages.firstMemberId))
      .innerJoin(second, eq(second.id, directMessages.secondMemberId))
      .innerJoin(firstProfile, eq(firstProfile.id, first.userProfileId))
      .innerJoin(secondProfile, eq(secondProfile.id, second.userProfileId))
      .where(
        and(
          eq(viewerProfile.oidcUserId, userId),
          eq(viewer.status, 'active'),
          filter === 'missed'
            ? and(eq(calls.status, 'missed'), ne(calls.startedByMemberId, viewer.id))
            : undefined,
          cursor
            ? or(
                lt(calls.startedAt, cursor.startedAt),
                and(eq(calls.startedAt, cursor.startedAt), lt(calls.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(calls.startedAt), desc(calls.id))
      .limit(limit + 1);
    return rows.map((row) => {
      const other = row.first.id === row.viewerId ? row.second : row.first;
      return {
        ...row.call,
        participant: {
          memberId: other.id,
          displayName: other.displayName,
          avatarPath: other.avatarPath,
          active: other.status === 'active',
        },
      };
    });
  }
}
