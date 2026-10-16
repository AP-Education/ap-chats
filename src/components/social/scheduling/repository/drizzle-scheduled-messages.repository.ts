import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, count, eq, isNull, lte, sql } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { scheduledMessages } from '@/database/drizzle/schema';

import type {
  NewScheduledMessage,
  ScheduledMessageChange,
  ScheduledMessageModel,
} from '../types/scheduled-message.types';
import { ScheduledMessagesRepository } from './scheduled-messages.repository';

const isDue = () =>
  and(isNull(scheduledMessages.failure), lte(scheduledMessages.sendAt, sql`now()`));

@Injectable()
export class DrizzleScheduledMessagesRepository extends ScheduledMessagesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  listOwn(channelId: string, authorMemberId: string): Promise<ScheduledMessageModel[]> {
    return this.txHost.tx
      .select()
      .from(scheduledMessages)
      .where(this.ownedBy(channelId, authorMemberId))
      .orderBy(asc(scheduledMessages.sendAt), asc(scheduledMessages.createdAt));
  }

  async countOwn(channelId: string, authorMemberId: string): Promise<number> {
    const [row] = await this.txHost.tx
      .select({ total: count() })
      .from(scheduledMessages)
      .where(this.ownedBy(channelId, authorMemberId));
    return row?.total ?? 0;
  }

  async findByNonce(
    channelId: string,
    authorMemberId: string,
    clientNonce: string,
  ): Promise<ScheduledMessageModel | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(scheduledMessages)
      .where(
        and(
          this.ownedBy(channelId, authorMemberId),
          eq(scheduledMessages.clientNonce, clientNonce),
        ),
      );
    return row ?? null;
  }

  async lockOwn(
    channelId: string,
    authorMemberId: string,
    id: string,
  ): Promise<ScheduledMessageModel | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(scheduledMessages)
      .where(and(this.ownedBy(channelId, authorMemberId), eq(scheduledMessages.id, id)))
      .for('update');
    return row ?? null;
  }

  due(limit: number): Promise<ScheduledMessageModel[]> {
    return this.txHost.tx
      .select()
      .from(scheduledMessages)
      .where(isDue())
      .orderBy(asc(scheduledMessages.sendAt))
      .limit(limit);
  }

  async lockDue(id: string): Promise<ScheduledMessageModel | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(scheduledMessages)
      .where(and(eq(scheduledMessages.id, id), isDue()))
      .for('update', { skipLocked: true });
    return row ?? null;
  }

  async insert(data: NewScheduledMessage): Promise<ScheduledMessageModel> {
    const [row] = await this.txHost.tx.insert(scheduledMessages).values(data).returning();
    if (!row) throw new Error('Scheduled message insert failed');
    return row;
  }

  async update(
    id: string,
    change: ScheduledMessageChange,
    nextRevision: number,
  ): Promise<ScheduledMessageModel> {
    const [row] = await this.txHost.tx
      .update(scheduledMessages)
      .set({ ...change, revision: nextRevision, updatedAt: new Date() })
      .where(eq(scheduledMessages.id, id))
      .returning();
    if (!row) throw new Error('Scheduled message update failed');
    return row;
  }

  async markFailed(id: string, failure: string): Promise<void> {
    await this.txHost.tx
      .update(scheduledMessages)
      .set({ failure, updatedAt: new Date() })
      .where(eq(scheduledMessages.id, id));
  }

  async remove(id: string): Promise<void> {
    await this.txHost.tx.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
  }

  private ownedBy(channelId: string, authorMemberId: string) {
    return and(
      eq(scheduledMessages.channelId, channelId),
      eq(scheduledMessages.authorMemberId, authorMemberId),
    );
  }
}
