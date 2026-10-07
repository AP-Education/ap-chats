import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PermanentJobError } from '@/globals/jobs/job-queue';

import { ExpoServerPushProvider } from './expo-server-push.provider';

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

function providerRejecting(error: string) {
  const provider = new ExpoServerPushProvider({ get: () => undefined } as never);
  Object.assign(provider, {
    client: {
      sendPushNotificationsAsync: async () => [{ status: 'error', details: { error } }],
    },
  });
  return provider;
}

test('a malformed token is dropped like an unregistered device, without calling Expo', async () => {
  const provider = providerRejecting('never reached');

  assert.deepEqual(await provider.send('not-a-token', notification, 60), {
    status: 'unregistered',
  });
});

test('a rejection no retry can fix fails the job permanently', async () => {
  await assert.rejects(
    providerRejecting('MessageTooBig').send(validToken, notification, 60),
    PermanentJobError,
  );
});

test('a rate limit stays retryable', async () => {
  await assert.rejects(
    providerRejecting('MessageRateExceeded').send(validToken, notification, 60),
    (error) => error instanceof Error && !(error instanceof PermanentJobError),
  );
});
