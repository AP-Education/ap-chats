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
  let latest = true;
  let recipients = [recipient];
  let context: unknown = { kind: 'private', name: 'Channel', actorName: 'Author' };
  let envelope: unknown = { body: 'current message' };
  let status = 'accepted';
  let failure: Error | null = null;
  const sent: unknown[] = [];
  const invalidated: unknown[] = [];
  const queued: unknown[] = [];
  const content = new MessageNotificationContentService(
    {
      recipients: async () => recipients,
      context: async () => context,
      latestMessage: async () =>
        envelope ? { actorName: 'Author', contentMarkdown: '**current** message' } : undefined,
    } as never,
    new NotificationPolicyService(),
  );
  const jobs = {
    enqueue: async (_queue: unknown, data: unknown) => {
      queued.push(data);
    },
  };
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
  const nativeChannel = new NativeAppChannel(
    nativeTargets,
    {
      send: async (_token: unknown, payload: unknown) => {
        if (failure) throw failure;
        sent.push(payload);
        return { status, receiptId: 'receipt' };
      },
      receipt: async () => status,
    } as never,
    jobs as never,
    {} as never,
  );
  const browserChannel = new BrowserChannel(browserTargets, {
    configured: true,
    send: async (_subscription: unknown, payload: unknown) => {
      if (failure) throw failure;
      sent.push(payload);
      return status;
    },
  } as never);
  const worker = new MessageDeliveryWorker(
    jobs as never,
    new NotificationChannelRegistry([nativeChannel, browserChannel]),
    { latest: async () => (latest ? batch : undefined) } as never,
    {} as never,
    content,
  );
  return {
    worker,
    nativeChannel,
    job,
    batch,
    supersede: () => {
      latest = false;
    },
    device,
    subscription,
    recipient,
    sent,
    invalidated,
    queued,
    read: () => {
      recipients = [];
    },
    removeChannel: () => {
      context = undefined;
    },
    deleteMessages: () => {
      envelope = null;
    },
    status: (value: string) => {
      status = value;
    },
    fail: () => {
      failure = new Error('temporary provider failure');
    },
  };
}

for (const reason of [
  'read',
  'mute',
  'removed access',
  'deleted message',
  'expired',
  'changed owner',
  'changed token',
] as const) {
  test(`delivery rechecks ${reason} before contacting a provider`, async () => {
    const f = fixture();
    if (reason === 'read') f.read();
    if (reason === 'mute') f.recipient.notificationsMuted = true;
    if (reason === 'removed access') f.removeChannel();
    if (reason === 'deleted message') f.deleteMessages();
    if (reason === 'expired') f.batch.expiresAt = new Date(0).toISOString();
    if (reason === 'changed owner') f.subscription.userId = 'another-account';
    if (reason === 'changed token') f.subscription.auth = 'rotated';
    await f.worker.deliver(f.job);
    assert.deepEqual(f.sent, []);
  });
}

test('focused realtime client suppresses its own web push', async () => {
  const f = fixture();
  f.subscription.activeUntil = new Date(Date.now() + 75000);
  await f.worker.deliver(f.job);
  assert.deepEqual(f.sent, []);
});

test('expired foreground lease permits push again', async () => {
  const f = fixture();
  f.subscription.activeUntil = new Date(0);
  await f.worker.deliver(f.job);
  assert.equal(f.sent.length, 1);
});

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

test('accepted Expo delivery schedules a receipt rather than marking transport receipt as device delivery', async () => {
  const f = fixture('expo');
  await f.worker.deliver(f.job);
  assert.equal(f.queued.length, 1);
  assert.equal((f.queued[0] as { receiptId: string }).receiptId, 'receipt');
});

test('Expo DeviceNotRegistered clears only the attempted token', async () => {
  const f = fixture('expo');
  f.status('unregistered');
  await f.worker.deliver(f.job);
  assert.deepEqual(f.invalidated, [['device', 'token', 'push']]);
});

test('queue backlog delivers only the latest conversation window', async () => {
  const f = fixture();
  f.supersede();
  await f.worker.deliver(f.job);
  assert.deepEqual(f.sent, []);
});

test('message previews preserve Markdown storage and use the current author', async () => {
  const f = fixture('expo');
  await f.worker.deliver(f.job);
  assert.equal((f.sent[0] as { body: string }).body, 'current message');
  assert.equal((f.sent[0] as { title: string }).title, 'Author · Channel');
});

test('a pending native receipt stays retryable', async () => {
  const f = fixture('expo');
  f.status('pending');
  const receipt = {
    receiptId: 'receipt',
    deviceId: f.device.id,
    tokenFingerprint: f.job.target.fingerprint,
  };

  await assert.rejects(f.nativeChannel.checkReceipt(receipt), /not available yet/u);
  assert.deepEqual(f.invalidated, []);
});

test('a delayed receipt cannot invalidate a rotated native token', async () => {
  const f = fixture('expo');
  f.status('unregistered');
  const receipt = {
    receiptId: 'receipt',
    deviceId: f.device.id,
    tokenFingerprint: f.job.target.fingerprint,
  };

  f.device.pushToken = 'rotated';
  await f.nativeChannel.checkReceipt(receipt);
  assert.deepEqual(f.invalidated, []);

  f.device.pushToken = 'token';
  await f.nativeChannel.checkReceipt(receipt);
  assert.deepEqual(f.invalidated, [['device', 'token', 'push']]);
});
