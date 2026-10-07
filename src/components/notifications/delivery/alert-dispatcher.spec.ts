import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AlertDispatcher } from './alert-dispatcher';
import { type ConversationAlert, PUSH_ALERT_DUE_QUEUE } from './types';

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
  const dispatcher = new AlertDispatcher(
    {
      enqueue: async (name: string, data: ConversationAlert, options: { delay?: number }) => {
        deferred.push({ name, data, options });
      },
    } as never,
    { latestSeq: async () => 12n, findEligible: async () => ({ urgent: false }) } as never,
    {
      latest: async () => undefined,
      reserve: async () => ({ status: 'deferred', until }),
    } as never,
    { listTargets: async () => [{ channel: 'expo', id: 'device', fingerprint: 'token' }] } as never,
    { get: () => 30 } as never,
  );

  await dispatcher.dispatch(request);

  assert.equal(deferred.length, 1);
  assert.equal(deferred[0]!.name, PUSH_ALERT_DUE_QUEUE);
  assert.equal(deferred[0]!.data, request);
  assert.ok(deferred[0]!.options.delay! > 19_000 && deferred[0]!.options.delay! <= 20_000);
});
