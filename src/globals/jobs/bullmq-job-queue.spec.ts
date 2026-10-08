import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { Queue, QueueEvents } from 'bullmq';

import { startValkey } from '@/testing/valkey-server';

import { BullMqJobQueue } from './bullmq-job-queue';
import { PermanentJobError } from './job-queue';

test('BullMQ adapter behaviour the push pipeline relies on', { timeout: 20000 }, async (t) => {
  const port = await startValkey(t);
  const logged = { errors: [] as unknown[], retries: [] as unknown[] };
  const logger = {
    error: (fields: unknown) => logged.errors.push(fields),
    warn: (fields: unknown) => logged.retries.push(fields),
  };
  const jobs = new BullMqJobQueue(
    { get: () => `redis://127.0.0.1:${port}/0` } as never,
    logger as never,
  );
  t.after(() => jobs.onModuleDestroy());

  // Runs one job on a fresh queue and waits until BullMQ settles it.
  async function run(handle: (data: object) => Promise<void>, options: object = {}) {
    const name = `queue-${randomUUID()}`;
    const connection = { host: '127.0.0.1', port };
    const queue = new Queue(name, { prefix: 'ap-connect', connection });
    const events = new QueueEvents(name, { prefix: 'ap-connect', connection });
    t.after(() => Promise.all([queue.close(), events.close()]));
    await events.waitUntilReady();

    jobs.work(name, handle);
    await jobs.enqueue(name, {}, { id: `job:${randomUUID()}`, ...options });

    const [job] = await queue.getJobs();
    await job!.waitUntilFinished(events, 5000).catch(() => undefined);

    return queue.getJob(job!.id!);
  }

  await t.test('any key is a valid job ID, and a repeated key adds no second job', async () => {
    const name = `queue-${randomUUID()}`;
    const queue = new Queue(name, {
      prefix: 'ap-connect',
      connection: { host: '127.0.0.1', port },
    });
    t.after(() => queue.close());

    await jobs.enqueue(name, {}, { id: 'alert:channel:1:2:member', delay: 60_000 });
    await jobs.enqueue(name, {}, { id: 'alert:channel:1:2:member', delay: 60_000 });

    assert.equal(await queue.getJobCountByTypes('delayed'), 1);
  });

  await t.test('a failure its retry recovers from is a warning, not an error', async () => {
    let attempts = 0;

    const job = await run(
      async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('transient provider failure');
      },
      { attempts: 2, backoff: { type: 'fixed', delay: 0 } },
    );

    assert.equal(attempts, 2);
    assert.ok(await job?.isCompleted());
    assert.equal(logged.errors.length, 0);
    assert.equal(logged.retries.length, 1);
  });

  await t.test('a permanent failure stops at once and is reported as an error', async () => {
    let attempts = 0;

    const job = await run(
      async () => {
        attempts += 1;
        throw new PermanentJobError('MessageTooBig');
      },
      { attempts: 5, backoff: { type: 'fixed', delay: 0 } },
    );

    assert.equal(attempts, 1);
    assert.ok(await job?.isFailed());
    assert.equal(logged.errors.length, 1);
  });

  await t.test('an expired job never reaches its handler', async () => {
    let handled = false;

    await run(
      async () => {
        handled = true;
      },
      { delay: 50, expiresAt: Date.now() - 1 },
    );

    assert.equal(handled, false);
  });
});
