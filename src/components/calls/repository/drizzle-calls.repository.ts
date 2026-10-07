import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, inArray, lt, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { throwConflictOnUnique } from '@/components/communities/repository/pg-unique-conflict';
import {
  calls,
  channelMemberships,
  directMessages,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { CallRecord } from '../types';
import { CallsRepository } from './calls.repository';

const ACTIVE_STATUSES = ['ringing', 'active'] as const;

@Injectable()
export class DrizzleCallsRepository extends CallsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async insert(input: {
    id: string;
    workspaceId: string;
    channelId: string;
    roomName: string;
    startedByMemberId: string;
  }): Promise<CallRecord> {
    try {
      const [row] = await this.txHost.tx.insert(calls).values(input).returning();
      if (!row) throw new Error('Call insert failed');
      return row;
    } catch (error) {
      return throwConflictOnUnique(error, 'Channel already has an ongoing call');
    }
  }

  async findActive(channelId: string): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .select()
      .from(calls)
      .where(and(eq(calls.channelId, channelId), inArray(calls.status, [...ACTIVE_STATUSES])));
    return row;
  }

  async findOwn(input: {
    workspaceId: string;
    channelId: string;
    callId: string;
  }): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .select()
      .from(calls)
      .where(
        and(
          eq(calls.id, input.callId),
          eq(calls.channelId, input.channelId),
          eq(calls.workspaceId, input.workspaceId),
        ),
      );
    return row;
  }

  async activate(callId: string): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .update(calls)
      .set({ status: 'active' })
      .where(and(eq(calls.id, callId), eq(calls.status, 'ringing')))
      .returning();
    return row;
  }

  /**
   * Matches 'ringing' or 'active', not just 'ringing': the caller's own
   * start() immediately joins its own call too, which activates it before
   * the other side ever sees it ring. A DM decline (the only caller of
   * this — CallsService.decline() no-ops for channels before reaching
   * here) must still be able to end that call, or a callee who declines
   * an already-self-activated call silently does nothing.
   */
  async decline(callId: string): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .update(calls)
      .set({ status: 'declined', endedAt: new Date() })
      .where(and(eq(calls.id, callId), inArray(calls.status, [...ACTIVE_STATUSES])))
      .returning();
    return row;
  }

  async end(callId: string): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .update(calls)
      .set({ status: 'ended', endedAt: new Date() })
      .where(and(eq(calls.id, callId), inArray(calls.status, [...ACTIVE_STATUSES])))
      .returning();
    return row;
  }

  async sweepStale(channelId: string, olderThan: Date): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .update(calls)
      .set({ status: 'missed', endedAt: new Date() })
      .where(
        and(
          eq(calls.channelId, channelId),
          eq(calls.status, 'ringing'),
          lt(calls.startedAt, olderThan),
        ),
      )
      .returning();
    return row;
  }

  async ringRecipients(channelId: string, excludeMemberId: string | null): Promise<string[]> {
    const rows = await this.txHost.tx
      .select({ oidcUserId: userProfiles.oidcUserId })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(channelMemberships.channelId, channelId),
          excludeMemberId === null ? undefined : ne(channelMemberships.memberId, excludeMemberId),
        ),
      );
    return rows.map((row) => row.oidcUserId);
  }

  async listForMember(
    workspaceId: string,
    memberId: string,
    cursor: { startedAt: Date; id: string } | undefined,
    limit: number,
  ) {
    const first = alias(workspaceMembers, 'call_history_first');
    const second = alias(workspaceMembers, 'call_history_second');
    const firstProfile = alias(userProfiles, 'call_history_first_profile');
    const secondProfile = alias(userProfiles, 'call_history_second_profile');
    const rows = await this.txHost.tx
      .select({
        call: calls,
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
      .innerJoin(first, eq(first.id, directMessages.firstMemberId))
      .innerJoin(second, eq(second.id, directMessages.secondMemberId))
      .innerJoin(firstProfile, eq(firstProfile.id, first.userProfileId))
      .innerJoin(secondProfile, eq(secondProfile.id, second.userProfileId))
      .where(
        and(
          eq(calls.workspaceId, workspaceId),
          or(
            eq(directMessages.firstMemberId, memberId),
            eq(directMessages.secondMemberId, memberId),
          ),
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
      const other = row.first.id === memberId ? row.second : row.first;
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
