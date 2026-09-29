import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray, lt, ne } from 'drizzle-orm';

import {
  calls,
  channelMemberships,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { CallRecord } from '../types';
import { CallsRepository } from './calls.repository';

const ACTIVE_STATUSES = ['ringing', 'active'] as const;

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== 'object') return false;
    if ('code' in current && current.code === '23505') return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

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
      if (!isUniqueViolation(error)) throw error;
      // Lost the race for the one ringing/active call this channel may hold:
      // hand back whichever call won it instead of failing the caller.
      const existing = await this.findActive(input.channelId);
      if (!existing) throw error;
      return existing;
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

  async decline(callId: string): Promise<CallRecord | undefined> {
    const [row] = await this.txHost.tx
      .update(calls)
      .set({ status: 'declined', endedAt: new Date() })
      .where(and(eq(calls.id, callId), eq(calls.status, 'ringing')))
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

  async ringRecipients(channelId: string, excludeMemberId: string): Promise<string[]> {
    const rows = await this.txHost.tx
      .select({ oidcUserId: userProfiles.oidcUserId })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(channelMemberships.channelId, channelId),
          ne(channelMemberships.memberId, excludeMemberId),
        ),
      );
    return rows.map((row) => row.oidcUserId);
  }
}
