import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CallSignalEvent,
  type CallSignalPayload,
} from '@/components/calls/events/call-signal.event';
import { NativePushTargetsStrategy } from '@/components/devices';
import { tokenFingerprint } from '@/components/devices/targets/credential-fingerprint';

import { CallPushWorker } from './call-push.worker';
import { CallPushProviderRegistry } from './provider';
import { PushProviderError } from './provider/push-provider-error';

const payload: CallSignalPayload = {
  workspaceId: 'ws',
  channelId: 'channel',
  channelKind: 'dm',
  callId: 'call',
  roomName: 'room',
  startedByMemberId: 'member',
  startedByDisplayName: 'Alice',
  startedByAvatarPath: null,
};
function fixture() {
  const device = {
    id: 'device',
    userId: 'reader',
    platform: 'ios' as const,
    voipToken: 'token',
    pushToken: null,
  };
  const sent: string[] = [],
    invalidated: unknown[] = [],
    queued: unknown[] = [];
  let ringing = true,
    failure: Error | undefined;
  const provider = {
    isConfigured: true,
    sendIncomingCall: async () => {
      if (failure) throw failure;
      sent.push(device.platform);
    },
  };
  const registry = new CallPushProviderRegistry(provider as never, provider as never);
  const worker = new CallPushWorker(
    {} as never,
    {
      enqueue: async (...args: unknown[]) => {
        queued.push(args);
      },
    } as never,
    new NativePushTargetsStrategy({
      listForUsers: async () => [device],
      find: async () => device,
      invalidateToken: async (...args: unknown[]) => {
        invalidated.push(args);
      },
    } as never),
    registry,
    { ringingForRecipient: async () => (ringing ? { startedAt: new Date() } : null) } as never,
    {} as never,
  );
  return {
    worker,
    device,
    sent,
    invalidated,
    queued,
    job: {
      payload,
      userId: 'reader',
      deviceId: device.id,
      tokenFingerprint: tokenFingerprint(device.voipToken),
    },
    stop: () => {
      ringing = false;
    },
    fail: () => {
      failure = new PushProviderError('invalid', true);
    },
  };
}

test('incoming calls create immediate queue jobs and other signals create none', async () => {
  const f = fixture();
  await f.worker.fanout(new CallSignalEvent('call:incoming', payload, ['reader']));
  assert.equal(f.queued.length, 1);
  const options = (f.queued[0] as unknown[])[2] as {
    priority: number;
    delay?: number;
    expiresAt: number;
  };
  assert.equal(options.priority, 1);
  assert.equal(options.delay, undefined);
  assert.ok(options.expiresAt > Date.now() + 44000);
  await f.worker.fanout(new CallSignalEvent('call:ended', payload, ['reader']));
  assert.equal(f.queued.length, 1);
});

test('call delivery rechecks ownership, token and ringing state', async () => {
  const f = fixture();
  await f.worker.deliver(f.job);
  assert.equal(f.sent.length, 1);
  f.device.userId = 'other';
  await f.worker.deliver(f.job);
  assert.equal(f.sent.length, 1);
  f.device.userId = 'reader';
  f.device.voipToken = 'rotated';
  await f.worker.deliver(f.job);
  assert.equal(f.sent.length, 1);
  f.device.voipToken = 'token';
  f.stop();
  await f.worker.deliver(f.job);
  assert.equal(f.sent.length, 1);
});

test('invalid VoIP token clears only the attempted current token', async () => {
  const f = fixture();
  f.fail();
  await f.worker.deliver(f.job);
  assert.deepEqual(f.invalidated, [['device', 'token', 'voip']]);
});
