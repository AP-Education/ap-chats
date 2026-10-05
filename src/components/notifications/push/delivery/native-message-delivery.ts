import { Injectable, type OnModuleInit } from '@nestjs/common';

import { NativePushTargetsStrategy, type PushTargetReference } from '@/components/devices';
import { AppConfigService } from '@/globals/config';
import { jobId } from '@/globals/jobs/job-id';
import { JobQueue } from '@/globals/jobs/job-queue';

import { ExpoPushProvider } from '../provider/expo-push.provider';
import {
  EXPO_RECEIPT_EVENT,
  type MessageNotificationPayload,
  type NativePushReceiptJob,
  PUSH_EXPO_DELIVERY_EVENT,
} from '../types';
import { MessagePushDelivery } from './message-push-delivery';

@Injectable()
export class NativeMessageDelivery extends MessagePushDelivery implements OnModuleInit {
  readonly queueName = PUSH_EXPO_DELIVERY_EVENT;
  readonly rateLimit = { max: 500, duration: 1000 };

  constructor(
    private readonly targets: NativePushTargetsStrategy,
    private readonly provider: ExpoPushProvider,
    private readonly jobs: JobQueue,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    this.jobs.work<NativePushReceiptJob>(EXPO_RECEIPT_EVENT, (job) => this.receipt(job), {
      rateLimit: { max: 100, duration: 1000 },
    });
  }

  async send(
    target: PushTargetReference,
    notification: MessageNotificationPayload,
    ttl: number,
  ): Promise<void> {
    const device = await this.targets.findCurrentDevice(target, notification.userId, 'push');
    if (!device?.pushToken) return;

    const ticket = await this.provider.send(device.pushToken, notification, ttl);
    if (ticket.status === 'unregistered') {
      await this.targets.invalidateTokenIfCurrent(device, 'push');
      return;
    }

    const expiresAt = Date.now() + 23 * 3600000;
    await this.jobs.enqueue<NativePushReceiptJob>(
      EXPO_RECEIPT_EVENT,
      {
        receiptId: ticket.receiptId,
        deviceId: device.id,
        tokenFingerprint: target.fingerprint,
        expiresAt: new Date(expiresAt).toISOString(),
      },
      {
        id: jobId(ticket.receiptId),
        delay: 900000,
        attempts: 281,
        backoff: { type: 'fixed', delay: 60000 },
        expiresAt,
      },
    );
  }

  async receipt(job: NativePushReceiptJob): Promise<void> {
    if (Date.now() >= Date.parse(job.expiresAt)) return;

    const status = await this.provider.receipt(job.receiptId);
    if (status === 'pending') throw new Error('Expo receipt is not available yet');

    if (status === 'unregistered') {
      await this.targets.invalidateTokenFromReceipt(job.deviceId, job.tokenFingerprint);
    }
  }
}
