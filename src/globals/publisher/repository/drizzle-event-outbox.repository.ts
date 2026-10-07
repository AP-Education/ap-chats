import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

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
  async claim(limit: number) {
    const result = await this.txHost.tx.execute<
      Omit<StoredOutboxEvent, 'expiresAt'> & { expiresAt: number | string }
    >(sql`
      update ${eventOutbox} set leased_until = now() + interval '60 seconds'
      where id in (select id from ${eventOutbox}
        where published_at is null and expires_at > now()
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
      .where(and(inArray(eventOutbox.id, ids), isNull(eventOutbox.publishedAt)));
  }
  async acknowledge(id: string): Promise<void> {
    await this.txHost.tx
      .update(eventOutbox)
      .set({ publishedAt: new Date(), leasedUntil: null })
      .where(eq(eventOutbox.id, id));
  }
  async purge(): Promise<void> {
    await this.txHost.tx.execute(sql`delete from ${eventOutbox} where id in (
      select id from ${eventOutbox} where expires_at < now() - interval '7 days'
      order by expires_at limit 1000)`);
  }
}
