import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type ChannelTarget, NotificationChannel } from './notification-channel';
import { NotificationChannelRegistry } from './notification-channel.registry';

// The shape a future channel takes, e.g. a messenger bot or a device on a desk.
class FakeChannel extends NotificationChannel {
  readonly delivery;

  constructor(
    readonly kind: string,
    readonly enabled = true,
  ) {
    super();
    this.delivery = { queue: `push.${kind}-delivery`, rateLimit: { max: 1, duration: 1 } };
  }

  async listTargets(userId: string): Promise<ChannelTarget[]> {
    return [{ channel: this.kind, id: `${this.kind}:${userId}`, fingerprint: 'credential' }];
  }

  async send(): Promise<void> {}
}

test('a new channel joins the alert flow just by being registered', async () => {
  const telegram = new FakeChannel('telegram');
  const registry = new NotificationChannelRegistry([new FakeChannel('expo'), telegram]);

  const targets = await registry.listTargets('reader');

  assert.deepEqual(
    targets.map((target) => target.channel),
    ['expo', 'telegram'],
  );
  assert.equal(registry.resolve('telegram'), telegram);
});

test('a disabled channel is skipped and an unknown one is refused', async () => {
  const registry = new NotificationChannelRegistry([
    new FakeChannel('expo'),
    new FakeChannel('web', false),
  ]);

  const targets = await registry.listTargets('reader');

  assert.deepEqual(
    targets.map((target) => target.channel),
    ['expo'],
  );
  assert.throws(() => registry.resolve('office-display'), /Unknown notification channel/u);
});
