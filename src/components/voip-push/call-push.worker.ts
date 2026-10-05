import { Injectable, type OnModuleInit } from '@nestjs/common';

import {
  CALL_SIGNAL_EVENT,
  type CallSignalEvent,
  type CallSignalPayload,
} from '@/components/calls/events/call-signal.event';
import { NativePushTargetsStrategy } from '@/components/devices';
import { AppConfigService } from '@/globals/config';
import { jobId } from '@/globals/jobs/job-id';
import { JobQueue } from '@/globals/jobs/job-queue';

import { CallPushProviderRegistry } from './provider';
import { PushProviderError } from './provider/push-provider-error';
import { CallPushRepository } from './repository/call-push.repository';

interface CallPushJob {
  payload: CallSignalPayload;
  userId: string;
  deviceId: string;
  token: string;
}
const CALL_DELIVERY_EVENT = 'push.call-delivery';

@Injectable()
export class CallPushWorker implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly targets: NativePushTargetsStrategy,
    private readonly providers: CallPushProviderRegistry,
    private readonly calls: CallPushRepository,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;
    this.jobs.work<CallSignalEvent>(CALL_SIGNAL_EVENT, (event) => this.fanout(event));
    this.jobs.work<CallPushJob>(CALL_DELIVERY_EVENT, (job) => this.deliver(job), {
      concurrency: this.config.get('PUSH_WORKER_CONCURRENCY'),
      rateLimit: { max: 200, duration: 1000 },
    });
  }

  async fanout(event: CallSignalEvent): Promise<void> {
    if (event.kind !== 'call:incoming' || !this.providers.isAnyConfigured) return;
    for (let offset = 0; offset < event.recipientUserIds.length; offset += 100) {
      const targets = await this.targets.listCallTargetsForUsers(
        event.recipientUserIds.slice(offset, offset + 100),
      );
      for (const target of targets) {
        await this.jobs.enqueue<CallPushJob>(
          CALL_DELIVERY_EVENT,
          {
            payload: event.payload,
            userId: target.userId,
            deviceId: target.id,
            token: target.fingerprint,
          },
          {
            id: jobId(`call:${event.payload.callId}:${target.id}:${target.fingerprint}`),
            priority: 1,
            attempts: 4,
            backoff: { type: 'exponential', delay: 2000 },
            expiresAt: Date.now() + 45000,
          },
        );
      }
    }
  }

  async deliver(job: CallPushJob): Promise<void> {
    const device = await this.targets.findCurrentDevice(
      { id: job.deviceId, fingerprint: job.token },
      job.userId,
      'voip',
    );
    if (!device) return;
    const call = await this.calls.ringingForRecipient(
      job.payload.workspaceId,
      job.payload.channelId,
      job.payload.callId,
      job.userId,
    );
    if (!call || Date.now() - call.startedAt.getTime() >= 45000) return;
    try {
      await this.providers.resolve(device.platform).sendIncomingCall(device, job.payload);
    } catch (error) {
      if (error instanceof PushProviderError && error.invalidToken) {
        await this.targets.invalidateTokenIfCurrent(device, 'voip');
        return;
      }
      throw error;
    }
  }
}
