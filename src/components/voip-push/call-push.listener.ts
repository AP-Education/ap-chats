import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

// Deep import, not the `@/components/calls` barrel: that barrel re-exports
// calls.module.ts, which imports VoipPushModule — going through it here would
// close a circular module cycle (calls -> calls.module -> voip-push ->
// voip-push.module -> this file -> calls), risking CALL_SIGNAL_EVENT reading as
// undefined at @OnEvent's evaluation time depending on load order.
import { CALL_SIGNAL_EVENT, CallSignalEvent } from '@/components/calls/events/call-signal.event';
import { DeviceRecord, DevicesService } from '@/components/devices';
import { Logger } from '@/globals/logger';

import { PushProviderRegistry } from './provider';

/**
 * Only `call:incoming` is forwarded to a real push — see CallPushProvider's doc
 * comment for why an already-ringing device can't be remotely cancelled this way
 * in this phase (mitigated by the native incomingCallTimeout instead).
 */
@Injectable()
export class CallPushListener {
  constructor(
    private readonly devices: DevicesService,
    private readonly providers: PushProviderRegistry,
    private readonly logger: Logger,
  ) {}

  @OnEvent(CALL_SIGNAL_EVENT)
  async onSignal(event: CallSignalEvent): Promise<void> {
    if (event.kind !== 'call:incoming') return;
    if (!this.providers.isAnyConfigured) return;
    await Promise.all(event.recipientUserIds.map((userId) => this.notifyUser(userId, event)));
  }

  private async notifyUser(userId: string, event: CallSignalEvent): Promise<void> {
    const devices = await this.devices.listForUser(userId);
    await Promise.all(
      devices.map((device) =>
        this.notifyDevice(device, event).catch((error: unknown) => {
          this.logger.warn({ error, userId }, '[voip-push] failed to notify device');
        }),
      ),
    );
  }

  private notifyDevice(device: DeviceRecord, event: CallSignalEvent): Promise<void> {
    return this.providers.resolve(device.platform).sendIncomingCall(device, event.payload);
  }
}
