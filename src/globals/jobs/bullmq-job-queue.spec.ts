import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { Queue, QueueEvents } from 'bullmq';

import { BullMqJobQueue } from './bullmq-job-queue';

// Isolated process and queues: never connect to the application Valkey instance.
test(
  'BullMQ on Valkey deduplicates IDs, retries and shares rate limits between workers',
  { timeout: 20000 },
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'ap-push-valkey-'));
    const listener = createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const address = listener.address();
    assert.ok(address && typeof address !== 'string');
    const port = address.port;
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    const server = spawn(
      'valkey-server',
      [
        '--bind',
        '127.0.0.1',
        '--port',
        String(port),
        '--dir',
        directory,
        '--save',
        '',
        '--appendonly',
        'no',
        '--maxmemory-policy',
        'noeviction',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.once('exit', (code) => reject(new Error(`Valkey exited before readiness: ${code}`)));
      server.stdout.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('Ready to accept connections')) resolve();
      });
      server.stderr.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('Failed')) reject(new Error(chunk.toString()));
      });
    });
    const config = {
      get: (key: string) => (key === 'VALKEY_URL' ? `redis://127.0.0.1:${port}/0` : true),
    };
    const errors: unknown[] = [];
    const retries: unknown[] = [];
    const logger = {
      error: (value: unknown) => {
        errors.push(value);
      },
      warn: (value: unknown) => {
        retries.push(value);
      },
    };
    const first = new BullMqJobQueue(config as never, logger as never),
      second = new BullMqJobQueue(config as never, logger as never);
    const name = `messages-${randomUUID()}`,
      criticalName = `calls-${randomUUID()}`;
    const observed = new Queue(name, {
      prefix: 'ap-connect',
      connection: { host: '127.0.0.1', port },
    });
    t.after(async () => {
      await observed.close();
      await first.onModuleDestroy();
      await second.onModuleDestroy();
      server.kill('SIGTERM');
      if (server.exitCode === null) await once(server, 'exit');
      await rm(directory, { recursive: true, force: true });
    });
    const starts: number[] = [],
      attempts = new Map<string, number>();
    let finish: (() => void) | undefined, finishCritical: (() => void) | undefined;
    const complete = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const criticalComplete = new Promise<void>((resolve) => {
      finishCritical = resolve;
    });
    const ids = Array.from({ length: 5 }, () => randomUUID());
    const handler = async (_data: object, id: string) => {
      starts.push(Date.now());
      const count = (attempts.get(id) ?? 0) + 1;
      attempts.set(id, count);
      if (id === ids[0] && count === 1) throw new Error('transient provider failure');
      if (attempts.size === ids.length && (attempts.get(ids[0]!) ?? 0) === 2 && starts.length === 6)
        finish?.();
    };
    first.work(name, handler, { concurrency: 4, rateLimit: { max: 2, duration: 500 } });
    second.work(name, handler, { concurrency: 4, rateLimit: { max: 2, duration: 500 } });
    first.work(criticalName, async () => {
      finishCritical?.();
    });
    await first.enqueueMany(
      name,
      ids.map((id) => ({
        data: { value: id },
        options: { id, attempts: 2, backoff: { type: 'fixed', delay: 0 } },
      })),
    );
    await first.enqueue(
      name,
      { value: ids[0]! },
      { id: ids[0]!, attempts: 2, backoff: { type: 'fixed', delay: 0 } },
    );
    const criticalStarted = Date.now();
    await first.enqueue(criticalName, {});
    await criticalComplete;
    assert.ok(
      Date.now() - criticalStarted < 500,
      'calls use a separate queue without the message rate limiter',
    );
    await complete;
    assert.equal(attempts.size, 5);
    assert.equal(attempts.get(ids[0]!), 2);
    assert.ok(starts[2]! - starts[0]! >= 450, 'two workers share one queue limit');
    assert.ok(starts[4]! - starts[0]! >= 900, 'rate limiter continues across windows');
    const stored = await observed.getJob(ids[0]!);
    assert.deepEqual(stored?.data, { payload: { value: ids[0] } });
    assert.equal(stored?.opts.attempts, 2);
    const criticalQueue = new Queue(criticalName, {
      prefix: 'ap-connect',
      connection: { host: '127.0.0.1', port },
    });
    t.after(() => criticalQueue.close());
    const [critical] = await criticalQueue.getJobs(['completed', 'active']);
    assert.equal(
      critical?.opts.attempts,
      8,
      'unspecified attempts retain the default retry policy',
    );
    assert.equal(errors.length, 0, 'a failure its retry recovers from is not an error');
    assert.equal(retries.length, 1);
    assert.equal((retries[0] as { err: Error }).err.message, 'transient provider failure');

    await t.test(
      'native throttle coalesces one conversation without extending its first deadline',
      async () => {
        const burstName = `burst-${randomUUID()}`;
        const connection = { host: '127.0.0.1', port };
        const queue = new Queue(burstName, { prefix: 'ap-connect', connection });
        const events = new QueueEvents(burstName, { prefix: 'ap-connect', connection });
        t.after(async () => {
          await events.close();
          await queue.close();
        });
        await events.waitUntilReady();
        const received: object[] = [];
        first.work(burstName, async (data) => {
          received.push(data);
        });
        const firstId = randomUUID(),
          ignoredId = randomUUID(),
          otherId = randomUUID();
        const options = { delay: 400, deduplication: { id: 'reader-conversation', ttl: 1000 } };
        await first.enqueue(burstName, { firstSeq: '10' }, { ...options, id: firstId });
        const firstJob = await queue.getJob(firstId);
        assert.ok(firstJob);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await second.enqueueMany(burstName, [
          {
            data: { firstSeq: '11' },
            options: { ...options, id: ignoredId },
          },
          {
            data: { firstSeq: '20' },
            options: {
              ...options,
              id: otherId,
              deduplication: { id: 'another-reader-conversation', ttl: 1000 },
            },
          },
        ]);
        const otherJob = await queue.getJob(otherId);
        assert.ok(otherJob);
        assert.equal(await queue.getJob(ignoredId), undefined);
        const unchanged = await queue.getJob(firstId);
        assert.equal(unchanged?.timestamp, firstJob.timestamp);
        assert.equal(unchanged?.delay, 400);
        await Promise.all([
          firstJob.waitUntilFinished(events, 3000),
          otherJob.waitUntilFinished(events, 3000),
        ]);
        assert.deepEqual(received, [{ firstSeq: '10' }, { firstSeq: '20' }]);
      },
    );

    await t.test('expired delayed jobs do not call a provider handler', async () => {
      const expiryName = `expiry-${randomUUID()}`;
      const connection = { host: '127.0.0.1', port };
      const queue = new Queue(expiryName, { prefix: 'ap-connect', connection });
      const events = new QueueEvents(expiryName, { prefix: 'ap-connect', connection });
      t.after(async () => {
        await events.close();
        await queue.close();
      });
      await events.waitUntilReady();
      let handled = false;
      first.work(expiryName, async () => {
        handled = true;
      });
      const id = randomUUID();
      await first.enqueue(expiryName, {}, { id, delay: 100, expiresAt: Date.now() - 1 });
      const job = await queue.getJob(id);
      assert.ok(job);
      await job.waitUntilFinished(events, 3000);
      assert.equal(handled, false);
    });
  },
);
