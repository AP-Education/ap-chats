import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { eq, inArray, sql } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { eventOutbox } from '@/database/drizzle/schema';

import {
  EventOutboxRepository,
  type NewOutboxEvent,
  type StoredOutboxEvent,
} from './event-outbox.repository';

@Injectable()
export class DrizzleEventOutboxRepository extends EventOutboxRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async append(event: NewOutboxEvent): Promise<void> {
    await this.txHost.tx.insert(eventOutbox).values(event).onConflictDoNothing();
  }

  // A lease, not a lock: a crashed relay's events come back once it runs out.
  async claim(limit: number) {
    const result = await this.txHost.tx.execute<
      Omit<StoredOutboxEvent, 'expiresAt'> & { expiresAt: number | string }
    >(sql`
      update ${eventOutbox} set leased_until = now() + interval '60 seconds'
      where id in (select id from ${eventOutbox}
        where expires_at > now()
        and (leased_until is null or leased_until <= now())
        order by priority, created_at, id limit ${limit} for update skip locked)
      returning id, name, payload, priority,
        extract(epoch from expires_at) * 1000 as "expiresAt"`);

    return result.rows.map((row) => ({ ...row, expiresAt: new Date(Number(row.expiresAt)) }));
  }

  async release(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.txHost.tx
      .update(eventOutbox)
      .set({ leasedUntil: null })
      .where(inArray(eventOutbox.id, ids));
  }

  // Once the queue holds the event, the queue's own job ID is what keeps it from repeating.
  async acknowledge(id: string): Promise<void> {
    await this.txHost.tx.delete(eventOutbox).where(eq(eventOutbox.id, id));
  }

  async purgeExpired(): Promise<void> {
    await this.txHost.tx.execute(sql`delete from ${eventOutbox} where id in (
      select id from ${eventOutbox} where expires_at < now() order by expires_at limit 1000)`);
  }
}
