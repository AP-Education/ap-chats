import { Injectable, type OnModuleInit } from '@nestjs/common';

import {
  CALL_SIGNAL_EVENT,
  type CallSignalEvent,
  type CallSignalPayload,
} from '@/components/calls/calls/events/call-signal.event';
import {
  RING_ENDED_EVENT,
  type RingEndedEvent,
  type RingEndReason,
} from '@/components/calls/calls/events/ring-ended.event';
import { type DeviceRecord, NativePushTargetsStrategy } from '@/components/devices';
import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';
import { Logger } from '@/globals/logger';
import { IntegrationEvents } from '@/globals/publisher/integration-events';

import { CallPushProviderRegistry } from './provider';
import type { CallPushProvider } from './provider/call-push-provider.types';
import { PushProviderError } from './provider/push-provider-error';
import { CallPushRepository } from './repository/call-push.repository';

interface DeviceJob {
  userId: string;
  deviceId: string;
  tokenFingerprint: string;
}

interface CallPushJob extends DeviceJob {
  payload: CallSignalPayload;
}

interface RingEndedJob extends DeviceJob {
  callId: string;
  reason: RingEndReason;
}

const CALL_DELIVERY_EVENT = 'push.call-delivery';
const RING_ENDED_DELIVERY_EVENT = 'push.ring-ended-delivery';
const RING_PUSH_TTL_MS = 45000;

@Injectable()
export class CallPushWorker implements OnModuleInit {
  constructor(
    private readonly events: IntegrationEvents,
    private readonly jobs: JobQueue,
    private readonly targets: NativePushTargetsStrategy,
    private readonly providers: CallPushProviderRegistry,
    private readonly calls: CallPushRepository,
    private readonly config: AppConfigService,
    private readonly logger: Logger,
  ) {}

  onModuleInit(): void {
    if (!this.config.runsPushWorkers()) return;
    if (!this.providers.isAnyConfigured) {
      this.logger.warn('VoIP push is off: neither APNs nor FCM credentials are set');
    }
    this.events.subscribe<CallSignalEvent>(CALL_SIGNAL_EVENT, 'voip-push', (event) =>
      this.fanout(event),
    );
    this.events.subscribe<RingEndedEvent>(RING_ENDED_EVENT, 'voip-push', (event) =>
      this.fanoutRingEnded(event),
    );
    const workerOptions = {
      concurrency: this.config.get('PUSH_WORKER_CONCURRENCY'),
      rateLimit: { max: 200, duration: 1000 },
    };
    this.jobs.work<CallPushJob>(CALL_DELIVERY_EVENT, (job) => this.deliver(job), workerOptions);
    this.jobs.work<RingEndedJob>(
      RING_ENDED_DELIVERY_EVENT,
      (job) => this.deliverRingEnded(job),
      workerOptions,
    );
  }

  async fanout(event: CallSignalEvent): Promise<void> {
    if (event.kind !== 'call:incoming' || !this.providers.isAnyConfigured) return;
    await this.forEachDevice(event.recipientUserIds, (device) =>
      this.jobs.enqueue<CallPushJob>(
        CALL_DELIVERY_EVENT,
        { payload: event.payload, ...device },
        {
          id: `call:${event.payload.callId}:${device.deviceId}:${device.tokenFingerprint}`,
          priority: 1,
          attempts: 4,
          backoff: { type: 'exponential', delay: 2000 },
          expiresAt: Date.now() + RING_PUSH_TTL_MS,
        },
      ),
    );
  }

  async fanoutRingEnded(event: RingEndedEvent): Promise<void> {
    if (!this.providers.isAnyConfigured) return;
    await this.forEachDevice(event.recipientUserIds, (device) =>
      this.jobs.enqueue<RingEndedJob>(
        RING_ENDED_DELIVERY_EVENT,
        { callId: event.callId, reason: event.reason, ...device },
        {
          id: `ring-ended:${event.callId}:${device.deviceId}:${device.tokenFingerprint}`,
          priority: 1,
          attempts: 4,
          backoff: { type: 'exponential', delay: 2000 },
          expiresAt: Date.now() + RING_PUSH_TTL_MS,
        },
      ),
    );
  }

  async deliver(job: CallPushJob): Promise<void> {
    const device = await this.currentDevice(job);
    if (!device) return;
    const call = await this.calls.ringingForRecipient(
      job.payload.workspaceId,
      job.payload.channelId,
      job.payload.callId,
      job.userId,
    );
    if (!call || Date.now() - call.startedAt.getTime() >= RING_PUSH_TTL_MS) return;

    await this.push(device, (provider) => provider.sendIncomingCall(device, job.payload));
  }

  async deliverRingEnded(job: RingEndedJob): Promise<void> {
    const device = await this.currentDevice(job);
    if (!device) return;

    await this.push(device, (provider) => provider.sendRingEnded(device, job.callId, job.reason));
  }

  private async forEachDevice(
    userIds: readonly string[],
    handle: (device: DeviceJob) => Promise<unknown>,
  ): Promise<void> {
    for (let offset = 0; offset < userIds.length; offset += 100) {
      const targets = await this.targets.listCallTargetsForUsers(
        userIds.slice(offset, offset + 100),
      );
      for (const target of targets) {
        await handle({
          userId: target.userId,
          deviceId: target.id,
          tokenFingerprint: target.fingerprint,
        });
      }
    }
  }

  private currentDevice(job: DeviceJob) {
    return this.targets.findCurrentDevice(
      { id: job.deviceId, fingerprint: job.tokenFingerprint },
      job.userId,
      'voip',
    );
  }

  private async push(
    device: DeviceRecord,
    send: (provider: CallPushProvider) => Promise<void>,
  ): Promise<void> {
    try {
      await send(this.providers.resolve(device.platform));
    } catch (error) {
      if (error instanceof PushProviderError && error.invalidToken) {
        this.logger.warn(
          { deviceId: device.id, platform: device.platform, reason: error.reason },
          'VoIP token rejected and cleared',
        );
        await this.targets.invalidateTokenIfCurrent(device, 'voip');
        return;
      }
      throw error;
    }
  }
}
