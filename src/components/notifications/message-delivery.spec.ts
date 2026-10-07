import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BrowserPushTargetsStrategy, NativePushTargetsStrategy } from '@/components/devices';
import type { WebPushSubscription } from '@/components/devices/browser/web-push.types';
import { subscriptionFingerprint } from '@/components/devices/targets/credential-fingerprint';
import { tokenFingerprint } from '@/components/devices/targets/credential-fingerprint';

import { MessageNotificationContentService } from './alerts/message-notification-content.service';
import { BrowserChannel } from './delivery/channels/browser.channel';
import { NativeAppChannel } from './delivery/channels/native-app.channel';
import { NotificationChannelRegistry } from './delivery/channels/notification-channel.registry';
import { MessageDeliveryWorker } from './delivery/message-delivery.worker';
import type { ConversationAlert, MessageDeliveryJob } from './delivery/types';
import { NotificationPolicyService } from './policy';

type Fixture = ReturnType<typeof fixture>;

function fixture(kind: 'web' | 'expo' = 'web') {
  const subscription: WebPushSubscription = {
    id: 'subscription',
    userId: 'reader',
    endpoint: 'https://fcm.googleapis.com/push/one',
    p256dh: 'key',
    auth: 'auth',
    activeUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const recipient = {
    memberId: 'reader-member',
    userId: 'reader',
    lastReadEntrySeq: 0n,
    level: 'all',
    notificationsMuted: false,
    mutedUntil: null,
    mentioned: false,
  };
  const device = { id: 'device', userId: 'reader', pushToken: 'token' };
  const batch: ConversationAlert = {
    id: 'batch',
    workspaceId: 'workspace',
    channelId: 'channel',
    userId: 'reader',
    memberId: 'reader-member',
    firstSeq: '1',
    lastSeq: '3',
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  const job: MessageDeliveryJob = {
    alert: batch,
    target: {
      channel: kind,
      id: kind === 'web' ? subscription.id : device.id,
      fingerprint:
        kind === 'web' ? subscriptionFingerprint(subscription) : tokenFingerprint(device.pushToken),
    },
  };
  let recipients = [recipient];
  const context = { kind: 'private', name: 'Channel', lastSeq: 3n };
  let status = 'accepted';
  let failure: Error | null = null;
  const sent: unknown[] = [];
  const invalidated: unknown[] = [];
  const content = new MessageNotificationContentService(
    {
      recipients: async () => recipients,
      context: async () => context,
      latestMessage: async () => ({ actorName: 'Author', contentMarkdown: '**current** message' }),
    } as never,
    new NotificationPolicyService(),
  );
  const nativeTargets = new NativePushTargetsStrategy({
    find: async () => device,
    invalidateToken: async (...args: unknown[]) => {
      invalidated.push(args);
    },
  } as never);
  const browserTargets = new BrowserPushTargetsStrategy({
    find: async () => subscription,
    invalidate: async (snapshot: unknown) => {
      invalidated.push(snapshot);
    },
  } as never);
  const nativeChannel = new NativeAppChannel(nativeTargets, {
    send: async (_token: unknown, payload: unknown) => {
      if (failure) throw failure;
      sent.push(payload);
      return status;
    },
  } as never);
  const browserChannel = new BrowserChannel(browserTargets, {
    configured: true,
    send: async (_subscription: unknown, payload: unknown) => {
      if (failure) throw failure;
      sent.push(payload);
      return status;
    },
  } as never);
  const worker = new MessageDeliveryWorker(
    {} as never,
    new NotificationChannelRegistry([nativeChannel, browserChannel]),
    content,
    {} as never,
  );
  return {
    worker,
    job,
    batch,
    device,
    subscription,
    recipient,
    sent,
    invalidated,
    read: () => {
      recipients = [];
    },
    status: (value: string) => {
      status = value;
    },
    fail: () => {
      failure = new Error('temporary provider failure');
    },
  };
}

// Each case changes one thing between the alert being queued and sent.
const staleAlerts = {
  'the conversation was read meanwhile': (f: Fixture) => f.read(),
  'the alert outlived its deadline': (f: Fixture) => {
    f.batch.expiresAt = new Date(0).toISOString();
  },
  'the browser now belongs to another account': (f: Fixture) => {
    f.subscription.userId = 'another-account';
  },
  'the browser credentials were rotated': (f: Fixture) => {
    f.subscription.auth = 'rotated';
  },
  'the person is looking at the app right now': (f: Fixture) => {
    f.subscription.activeUntil = new Date(Date.now() + 75000);
  },
};

for (const [reason, change] of Object.entries(staleAlerts)) {
  test(`nothing is sent when ${reason}`, async () => {
    const f = fixture();
    change(f);

    await f.worker.deliver(f.job);

    assert.deepEqual(f.sent, []);
  });
}

test('permanent web rejection invalidates the exact subscription snapshot', async () => {
  const f = fixture();
  f.status('unregistered');
  await f.worker.deliver(f.job);
  assert.equal(f.invalidated[0], f.subscription);
});

test('temporary failure reaches the queue retry mechanism', async () => {
  const f = fixture();
  f.fail();
  await assert.rejects(f.worker.deliver(f.job), /temporary provider failure/u);
  assert.deepEqual(f.invalidated, []);
});

test('Expo DeviceNotRegistered clears only the attempted token', async () => {
  const f = fixture('expo');
  f.status('unregistered');
  await f.worker.deliver(f.job);
  assert.deepEqual(f.invalidated, [['device', 'token', 'push']]);
});

test('message previews preserve Markdown storage and use the current author', async () => {
  const f = fixture('expo');
  await f.worker.deliver(f.job);
  assert.equal((f.sent[0] as { body: string }).body, 'current message');
  assert.equal((f.sent[0] as { title: string }).title, 'Author · Channel');
});
