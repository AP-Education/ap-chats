import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PermanentJobError } from '@/globals/jobs/job-queue';

import { ExpoPushClient } from './expo-push.client';

const notification = {
  eventId: 'event',
  userId: 'user',
  workspaceId: 'workspace',
  channelId: 'channel',
  url: '/channels/channel',
  title: 'Title',
  body: 'Body',
};
const validToken = 'ExponentPushToken[valid-token]';

function clientRejecting(error: string) {
  const provider = new ExpoPushClient({ get: () => undefined } as never);
  Object.assign(provider, {
    client: {
      sendPushNotificationsAsync: async () => [{ status: 'error', details: { error } }],
    },
  });
  return provider;
}

test('a malformed token is dropped like an unregistered device, without calling Expo', async () => {
  const provider = clientRejecting('never reached');

  assert.equal(await provider.send('not-a-token', notification, 60), 'unregistered');
});

test('a rejection no retry can fix fails the job permanently', async () => {
  await assert.rejects(
    clientRejecting('MessageTooBig').send(validToken, notification, 60),
    PermanentJobError,
  );
});

test('a rate limit stays retryable', async () => {
  await assert.rejects(
    clientRejecting('MessageRateExceeded').send(validToken, notification, 60),
    (error) => error instanceof Error && !(error instanceof PermanentJobError),
  );
});
