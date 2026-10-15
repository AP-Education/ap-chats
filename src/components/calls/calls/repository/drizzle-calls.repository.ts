import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray, lt, notInArray } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { throwConflictOnUnique } from '@/database/drizzle/pg-errors';
import {
  calls,
  channelMemberships,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';

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
      .set({ status: 'active', answeredAt: new Date() })
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

  async expire(callId: string): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .update(calls)
      .set({ status: 'missed', endedAt: new Date() })
      .where(and(eq(calls.id, callId), eq(calls.status, 'ringing')))
      .returning();
    return row;
  }

  async ringRecipients(channelId: string, excludedMemberIds: string[]): Promise<string[]> {
    const rows = await this.txHost.tx
      .select({ oidcUserId: userProfiles.oidcUserId })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(channelMemberships.channelId, channelId),
          eq(workspaceMembers.status, 'active'),
          excludedMemberIds.length
            ? notInArray(channelMemberships.memberId, excludedMemberIds)
            : undefined,
        ),
      );
    return rows.map((row) => row.oidcUserId);
  }
}
