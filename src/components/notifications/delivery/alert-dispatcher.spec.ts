import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jobId } from '@/globals/jobs/job-id';

import { AlertDispatcher } from './alert-dispatcher';
import type { ConversationAlert } from './types';

const alert: ConversationAlert = {
  id: 'alert-1',
  workspaceId: 'workspace',
  channelId: 'channel',
  firstSeq: '10',
  lastSeq: '12',
  userId: 'reader',
  memberId: 'member',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

test('a due alert becomes one stable job per target on that channel queue', async () => {
  const enqueued: Array<{ queue: string; id: string }> = [];
  const queues: Record<string, string> = { expo: 'push.expo-delivery', web: 'push.web-delivery' };
  const dispatcher = new AlertDispatcher(
    {
      enqueue: async (queue: string, _job: unknown, options: { id: string }) => {
        enqueued.push({ queue, id: options.id });
      },
    } as never,
    {
      listTargets: async () => [
        { channel: 'expo', id: 'phone', fingerprint: 'token' },
        { channel: 'web', id: 'browser', fingerprint: 'keys' },
      ],
      resolve: (kind: string) => ({ delivery: { queue: queues[kind] } }),
    } as never,
    {} as never,
  );

  await dispatcher.dispatch(alert);
  await dispatcher.dispatch(alert);

  assert.deepEqual(enqueued.slice(0, 2), [
    { queue: 'push.expo-delivery', id: jobId('alert-1:expo:phone:token') },
    { queue: 'push.web-delivery', id: jobId('alert-1:web:browser:keys') },
  ]);
  assert.deepEqual(enqueued.slice(2), enqueued.slice(0, 2), 'a retry reuses the same job IDs');
});
