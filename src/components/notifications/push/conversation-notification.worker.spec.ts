import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jobId } from '@/globals/jobs/job-id';
import type { JobRequest } from '@/globals/jobs/job-queue';

import { NotificationPolicyService } from '../policy';
import { ConversationNotificationWorker } from './conversation-notification.worker';
import {
  type ConversationAlert,
  type MessageFanoutJob,
  PUSH_ALERT_DUE_QUEUE,
  PUSH_FANOUT_QUEUE,
} from './types';

function fixture(level: 'default' | 'mentions' = 'mentions') {
  const source = {
    workspaceId: 'workspace',
    channelId: 'channel',
    actorMemberId: '003',
    firstSeq: '10',
    lastSeq: '10',
  };
  const createdAt = new Date();
  const page = Array.from({ length: 100 }, (_, index) => ({
    memberId: String(index).padStart(3, '0'),
    userId: `reader-${index}`,
    level,
    mutedUntil: null,
    notificationsMuted: index === 10,
    mentioned: [3, 7, 10].includes(index),
    lastReadEntrySeq: 0n,
  }));
  const batches: JobRequest<ConversationAlert>[][] = [];
  const continuation: MessageFanoutJob[] = [];
  let fail = false;
  const worker = new ConversationNotificationWorker(
    {
      enqueueMany: async (name: string, jobs: JobRequest<ConversationAlert>[]) => {
        assert.equal(name, PUSH_ALERT_DUE_QUEUE);
        batches.push(jobs);
        if (fail) throw new Error('queue unavailable');
      },
      enqueue: async (name: string, job: MessageFanoutJob) => {
        assert.equal(name, PUSH_FANOUT_QUEUE);
        continuation.push(job);
      },
    } as never,
    {
      context: async () => ({ kind: 'private' }),
      lastCreatedAt: async () => createdAt,
      recipients: async () => page,
    } as never,
    new NotificationPolicyService(),
    {} as never,
    { get: () => 3 } as never,
    {} as never,
    {} as never,
  );

  return {
    worker,
    source,
    createdAt,
    batches,
    continuation,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}

test('fanout preserves recipient policy and advances past silent members in a bounded page', async () => {
  const f = fixture();
  await f.worker.scheduleConversationAlerts({ source: f.source });

  const alerts = f.batches[0]!;
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]!.data.userId, 'reader-7');
  assert.equal(alerts[0]!.options?.delay, 3000);
  assert.equal(alerts[0]!.options?.expiresAt, f.createdAt.getTime() + 3600000);
  assert.deepEqual(alerts[0]!.options?.deduplication, {
    id: jobId('reader-7:channel'),
    ttl: 3000,
  });
  assert.deepEqual(f.continuation, [{ source: f.source, after: '099' }]);
});

test('default channel fanout includes non-mentions but excludes the author and muted members', async () => {
  const f = fixture('default');
  await f.worker.scheduleConversationAlerts({ source: f.source });
  const recipients = f.batches[0]!.map((alert) => alert.data.memberId);
  assert.equal(recipients.length, 98);
  assert.ok(recipients.includes('000'));
  assert.ok(recipients.includes('007'));
  assert.ok(!recipients.includes('003'));
  assert.ok(!recipients.includes('010'));
});

test('failed page enqueue does not advance fanout and retry retains the same alert IDs', async () => {
  const f = fixture();
  f.fail(true);
  await assert.rejects(
    f.worker.scheduleConversationAlerts({ source: f.source }),
    /queue unavailable/u,
  );
  assert.deepEqual(f.continuation, []);

  f.fail(false);
  await f.worker.scheduleConversationAlerts({ source: f.source });
  assert.deepEqual(f.batches[1], f.batches[0]);
  assert.equal(f.continuation.length, 1);
});

test('a throttled alert is rescheduled for when its window opens, not dropped', async () => {
  const until = new Date(Date.now() + 20_000);
  const deferred: Array<{ name: string; data: ConversationAlert; options: { delay?: number } }> =
    [];
  const request: ConversationAlert = {
    id: 'alert-1',
    workspaceId: 'workspace',
    channelId: 'channel',
    firstSeq: '10',
    lastSeq: '12',
    userId: 'reader',
    memberId: 'member',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
  const worker = new ConversationNotificationWorker(
    {
      enqueue: async (name: string, data: ConversationAlert, options: { delay?: number }) => {
        deferred.push({ name, data, options });
      },
    } as never,
    { context: async () => ({ kind: 'private', lastSeq: 12n }) } as never,
    new NotificationPolicyService(),
    {
      latest: async () => undefined,
      reserve: async () => ({ status: 'deferred', until }),
    } as never,
    { get: () => 30 } as never,
    { listTargets: async () => [{ channel: 'expo', id: 'device', fingerprint: 'token' }] } as never,
    { findEligibleMessage: async () => ({ urgent: false }) } as never,
  );

  await worker.dispatchConversationAlert(request);

  assert.equal(deferred.length, 1);
  assert.equal(deferred[0]!.name, PUSH_ALERT_DUE_QUEUE);
  assert.equal(deferred[0]!.data, request);
  assert.ok(deferred[0]!.options.delay! > 19_000 && deferred[0]!.options.delay! <= 20_000);
});
