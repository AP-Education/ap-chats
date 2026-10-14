import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type JobOptions, JobQueue } from '@/globals/jobs/job-queue';

import { CallSignalEvent, type CallSignalPayload } from './events/call-signal.event';
import { RingExpiry } from './ring-expiry';

class RecordingJobQueue extends JobQueue {
  readonly queued: { name: string; data: object; options: JobOptions | undefined }[] = [];

  async enqueue<T extends object>(name: string, data: T, options?: JobOptions) {
    this.queued.push({ name, data, options });
  }

  async enqueueMany() {}

  work() {}
}

const ring: CallSignalPayload = {
  workspaceId: 'workspace',
  channelId: 'channel',
  channelKind: 'dm',
  callId: 'call',
  roomName: 'room',
  startedByMemberId: 'caller',
  startedByDisplayName: 'Caller',
  startedByAvatarPath: null,
  status: 'ringing',
  startedAt: new Date(Date.now() - 5000).toISOString(),
  answeredAt: null,
};

function expiry() {
  const jobs = new RecordingJobQueue();
  return { jobs, expiry: new RingExpiry({} as never, jobs, {} as never, {} as never) };
}

test('a ring is set to expire once at its own deadline, not a full TTL from when it was heard', async () => {
  const { jobs, expiry: rings } = expiry();

  await rings.schedule(new CallSignalEvent('call:incoming', ring, ['callee']));

  assert.equal(jobs.queued.length, 1);
  const { data, options } = jobs.queued[0]!;
  assert.deepEqual(data, ring);
  assert.equal(options?.id, 'ring-expiry:call');
  const delay = options?.delay ?? 0;
  assert.ok(delay > 38_000 && delay <= 40_000, `expected about 40s left, got ${delay}`);
});

test('only a new ring is scheduled, and never one without a start to count from', async () => {
  const { jobs, expiry: rings } = expiry();

  await rings.schedule(new CallSignalEvent('call:accepted', ring, ['caller']));
  await rings.schedule(
    new CallSignalEvent('call:incoming', { ...ring, startedAt: undefined as never }, ['callee']),
  );

  assert.deepEqual(jobs.queued, []);
});
