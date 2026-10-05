import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CallSignalEvent,
  type CallSignalPayload,
} from '@/components/calls/events/call-signal.event';
import { DevicesService } from '@/components/devices/devices.service';
import { DevicesRepository } from '@/components/devices/repository/devices.repository';
import type { DeviceRecord } from '@/components/devices/types';
import { Logger } from '@/globals/logger/logger.interface';

import { CallPushListener } from './call-push.listener';
import type { CallPushProvider } from './provider/call-push-provider.types';
import { PushProviderRegistry } from './provider/push-provider.registry';

class FakeDevicesRepository extends DevicesRepository {
  constructor(private readonly devices: Map<string, DeviceRecord[]>) {
    super();
  }

  async register(): Promise<never> {
    throw new Error('not exercised by these tests');
  }

  async unregister(): Promise<never> {
    throw new Error('not exercised by these tests');
  }

  async listForUser(userId: string): Promise<DeviceRecord[]> {
    return this.devices.get(userId) ?? [];
  }
}

class FakePushProvider implements CallPushProvider {
  isConfigured = true;
  sent: DeviceRecord[] = [];

  async sendIncomingCall(device: DeviceRecord): Promise<void> {
    this.sent.push(device);
  }
}

class NoopLogger extends Logger {
  log() {}
  info() {}
  warn() {}
  error() {}
  debug() {}
  assign() {}
  child() {
    return this;
  }
}

function device(overrides: Partial<DeviceRecord>): DeviceRecord {
  return {
    id: 'device-1',
    userId: 'user-1',
    installationId: 'install-1',
    platform: 'ios',
    pushToken: 'push-token',
    voipToken: 'voip-token',
    ...overrides,
  };
}

const PAYLOAD: CallSignalPayload = {
  workspaceId: 'ws-1',
  channelId: 'chan-1',
  channelKind: 'dm',
  callId: 'call-1',
  roomName: 'room-1',
  startedByMemberId: 'member-1',
  startedByDisplayName: 'Alice',
  startedByAvatarPath: null,
};

function buildListener(
  devicesByUser: Map<string, DeviceRecord[]>,
  apns: FakePushProvider,
  fcm: FakePushProvider,
) {
  const devices = new DevicesService(new FakeDevicesRepository(devicesByUser));
  const registry = new PushProviderRegistry(apns as never, fcm as never);
  return new CallPushListener(devices, registry, new NoopLogger());
}

test('routes each recipient device to the provider matching its platform', async () => {
  const iosDevice = device({ platform: 'ios' });
  const androidDevice = device({
    id: 'device-2',
    platform: 'android',
    voipToken: 'fcm-voip-token',
  });
  const apns = new FakePushProvider();
  const fcm = new FakePushProvider();
  const listener = buildListener(new Map([['user-1', [iosDevice, androidDevice]]]), apns, fcm);

  await listener.onSignal(new CallSignalEvent('call:incoming', PAYLOAD, ['user-1']));

  assert.deepEqual(
    apns.sent.map((d) => d.id),
    ['device-1'],
  );
  assert.deepEqual(
    fcm.sent.map((d) => d.id),
    ['device-2'],
  );
});

test('ignores every signal but call:incoming — no supported push shape cancels an already-shown ring', async () => {
  const iosDevice = device({ platform: 'ios' });
  const apns = new FakePushProvider();
  const fcm = new FakePushProvider();
  const listener = buildListener(new Map([['user-1', [iosDevice]]]), apns, fcm);

  for (const kind of ['call:accepted', 'call:declined', 'call:ended', 'call:missed'] as const) {
    await listener.onSignal(new CallSignalEvent(kind, PAYLOAD, ['user-1']));
  }

  assert.deepEqual(apns.sent, []);
});

test('skips the device lookup entirely when neither push provider is configured', async () => {
  class ThrowingDevicesRepository extends DevicesRepository {
    async register(): Promise<never> {
      throw new Error('not exercised by this test');
    }
    async unregister(): Promise<never> {
      throw new Error('not exercised by this test');
    }
    async listForUser(): Promise<never> {
      throw new Error('should never be reached when push is unconfigured');
    }
  }
  const devices = new DevicesService(new ThrowingDevicesRepository());
  const apns = new FakePushProvider();
  apns.isConfigured = false;
  const fcm = new FakePushProvider();
  fcm.isConfigured = false;
  const registry = new PushProviderRegistry(apns as never, fcm as never);
  const listener = new CallPushListener(devices, registry, new NoopLogger());

  await listener.onSignal(new CallSignalEvent('call:incoming', PAYLOAD, ['user-1']));
});
