import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { JobOptions, JobRequest } from '@/globals/jobs/job-queue';

import { NotificationRequests } from '../delivery/notification-requests';
import { PUSH_ALERT_QUEUE } from '../delivery/types';
import { NotificationPolicyService } from '../policy';
import { ConversationAlertScheduler } from './conversation-alert.scheduler';
import { ConversationWindows } from './conversation-windows';
import type { ConversationAlert } from './types';

const window = { workspaceId: 'workspace', channelId: 'channel', firstSeq: '10' };

function fixture(level: 'default' | 'mentions' = 'mentions') {
  const createdAt = new Date();
  const page = Array.from({ length: 100 }, (_, index) => ({
    memberId: String(index).padStart(3, '0'),
    userId: `reader-${index}`,
    level,
    mutedUntil: null,
    notificationsMuted: index === 10,
    mentioned: [7, 10].includes(index),
    lastReadEntrySeq: 0n,
  }));
  const batches: JobRequest<ConversationAlert>[][] = [];
  const continued: { lastSeq: string; after: string }[] = [];
  let fail = false;
  const jobs = {
    enqueueMany: async (name: string, requests: JobRequest<ConversationAlert>[]) => {
      assert.equal(name, PUSH_ALERT_QUEUE);
      batches.push(requests);
      if (fail) throw new Error('queue unavailable');
    },
  };
  let lastSeq = 12n;
  const scheduler = new ConversationAlertScheduler(
    {} as never,
    {
      continueAfter: async (range: { lastSeq: string }, after: string) => {
        continued.push({ lastSeq: range.lastSeq, after });
      },
    } as never,
    {
      conversation: async () => ({ kind: 'private', lastSeq }),
      latestMessageAt: async () => createdAt,
      recipients: async () => page,
    } as never,
    new NotificationPolicyService(),
    new NotificationRequests(jobs as never),
    {} as never,
  );

  return {
    scheduler,
    createdAt,
    batches,
    continued,
    fail: (value: boolean) => {
      fail = value;
    },
    post: () => {
      lastSeq += 1n;
    },
  };
}

test('a burst in one channel shares a single delayed window', async () => {
  const opened: JobOptions[] = [];
  const windows = new ConversationWindows(
    {
      enqueue: async (_name: string, _job: object, options: JobOptions) => opened.push(options),
    } as never,
    { get: () => 3 } as never,
  );

  await windows.open(window);
  await windows.open({ ...window, firstSeq: '11' });

  assert.equal(opened[0]!.delay, 3000);
  assert.deepEqual(opened[0]!.deduplication, { id: 'window:channel', ttl: 3000 });
  assert.deepEqual(opened[1]!.deduplication, opened[0]!.deduplication);
});

test('a closed window covers every message up to the channel end and pins it for later pages', async () => {
  const f = fixture();
  await f.scheduler.alertRecipients({ window });
  f.post();

  const alerts = f.batches[0]!;
  assert.deepEqual(
    alerts.map((alert) => alert.data.userId),
    ['reader-7'],
  );
  assert.equal(alerts[0]!.data.lastSeq, '12');
  assert.equal(alerts[0]!.options?.expiresAt, f.createdAt.getTime() + 3600000);
  assert.deepEqual(f.continued, [{ lastSeq: '12', after: '099' }]);
});

test('default level alerts everyone with unread messages except muted members', async () => {
  const f = fixture('default');
  await f.scheduler.alertRecipients({ window });

  const recipients = f.batches[0]!.map((alert) => alert.data.memberId);
  assert.equal(recipients.length, 99);
  assert.ok(!recipients.includes('010'));
});

test('failed page enqueue does not advance fanout and retry retains the same alert IDs', async () => {
  const f = fixture();
  f.fail(true);
  await assert.rejects(f.scheduler.alertRecipients({ window }), /queue unavailable/u);
  assert.deepEqual(f.continued, []);

  f.fail(false);
  await f.scheduler.alertRecipients({ window });
  assert.deepEqual(f.batches[1], f.batches[0]);
  assert.equal(f.continued.length, 1);
});
