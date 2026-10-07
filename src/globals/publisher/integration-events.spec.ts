import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jobId } from '@/globals/jobs/job-id';

import { IntegrationEvents } from './integration-events';

function fixture() {
  const queues: string[] = [];
  const enqueued: Array<{ queue: string; id: string }> = [];
  const events = new IntegrationEvents({
    work: (queue: string) => {
      queues.push(queue);
    },
    enqueue: async (queue: string, _payload: object, options: { id: string }) => {
      enqueued.push({ queue, id: options.id });
    },
  } as never);
  const stored = {
    id: 'outbox-row',
    name: 'message.created',
    payload: { messageId: 'message' },
    priority: 10,
    expiresAt: new Date(Date.now() + 60_000),
  };

  return { events, queues, enqueued, stored };
}

test('every subscriber gets its own copy on its own queue', async () => {
  const f = fixture();
  f.events.subscribe('message.created', 'push', async () => {});
  f.events.subscribe('message.created', 'analytics', async () => {});

  await f.events.deliver(f.stored);

  assert.deepEqual(f.queues, ['message.created@push', 'message.created@analytics']);
  assert.deepEqual(f.enqueued, [
    { queue: 'message.created@push', id: jobId('outbox-row:push') },
    { queue: 'message.created@analytics', id: jobId('outbox-row:analytics') },
  ]);
});

test('an event nobody subscribes to is dropped without touching the queue', async () => {
  const f = fixture();

  await f.events.deliver(f.stored);

  assert.deepEqual(f.enqueued, []);
});
