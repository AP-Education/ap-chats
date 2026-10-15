import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EventEmitter2 } from '@nestjs/event-emitter';

import * as schema from '@/database/drizzle/schema';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { DrizzleEventOutboxRepository } from './repository/drizzle-event-outbox.repository';
import { TransactionalEventPublisher } from './transactional-event-publisher';

test('events and their transaction on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const txHost = transactionHost(db);
  const emitter = new EventEmitter2();
  const heard: unknown[] = [];
  emitter.on('change', (event) => heard.push(event));
  const events = new TransactionalEventPublisher(
    emitter,
    new DrizzleEventOutboxRepository(txHost as never),
    txHost as never,
  );
  const kept = () => db.select({ payload: schema.eventOutbox.payload }).from(schema.eventOutbox);

  await t.test('a change that rolls back is neither kept nor announced', async () => {
    await assert.rejects(
      txHost.withTransaction(async () => {
        await events.record('change', { value: 'rolled back' }, { durable: true });
        throw new Error('rollback');
      }),
    );

    assert.deepEqual(await kept(), []);
    assert.deepEqual(heard, [], 'the caller never reaches its announcement');
  });

  await t.test('a committed durable change is kept with it and announced after', async () => {
    const announce = await txHost.withTransaction(() =>
      events.record('change', { value: 1 }, { durable: true }),
    );
    assert.deepEqual(heard, [], 'nothing is heard before the caller announces');

    announce();

    assert.deepEqual(await kept(), [{ payload: { value: 1 } }]);
    assert.deepEqual(heard, [{ value: 1 }]);
  });

  await t.test('listeners never run inside a transaction', async () => {
    await assert.rejects(
      txHost.withTransaction(async () => events.publish('change', { value: 2 })),
      /inside a transaction/u,
    );
    assert.deepEqual(heard, [{ value: 1 }]);
  });

  await t.test('a durable event outside a transaction is refused', async () => {
    await assert.rejects(events.record('change', {}, { durable: true }), /inside its transaction/u);
  });
});
