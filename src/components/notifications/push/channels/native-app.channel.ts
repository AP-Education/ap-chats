import { Injectable, type OnModuleInit } from '@nestjs/common';

import { NativePushTargetsStrategy } from '@/components/devices';
import { AppConfigService } from '@/globals/config';
import { jobId } from '@/globals/jobs/job-id';
import { JobQueue } from '@/globals/jobs/job-queue';

import {
  EXPO_RECEIPT_QUEUE,
  type MessageNotificationPayload,
  type NativePushReceiptJob,
  PUSH_EXPO_DELIVERY_QUEUE,
} from '../types';
import { ExpoPushClient } from './expo-push.client';
import { type ChannelTarget, NotificationChannel } from './notification-channel';

// Expo publishes a receipt about 15 minutes after a send and keeps it for a day.
const RECEIPT_FIRST_CHECK_MS = 15 * 60_000;
const RECEIPT_LIFETIME_MS = 23 * 3600_000;
const RECEIPT_RECHECK_MS = 60_000;
const RECEIPT_CHECKS = 281;

@Injectable()
export class NativeAppChannel extends NotificationChannel implements OnModuleInit {
  readonly kind = 'expo';
  readonly enabled = true;
  readonly delivery = { queue: PUSH_EXPO_DELIVERY_QUEUE, rateLimit: { max: 500, duration: 1000 } };

  constructor(
    private readonly devices: NativePushTargetsStrategy,
    private readonly client: ExpoPushClient,
    private readonly jobs: JobQueue,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    this.jobs.work<NativePushReceiptJob>(EXPO_RECEIPT_QUEUE, (job) => this.checkReceipt(job), {
      rateLimit: { max: 100, duration: 1000 },
    });
  }

  async listTargets(userId: string): Promise<ChannelTarget[]> {
    const targets = await this.devices.listMessageTargetsForUser(userId);

    return targets.map((target) => ({ channel: this.kind, ...target }));
  }

  async send(
    target: ChannelTarget,
    notification: MessageNotificationPayload,
    ttl: number,
  ): Promise<void> {
    const device = await this.devices.findCurrentDevice(target, notification.userId, 'push');
    if (!device?.pushToken) return;

    const ticket = await this.client.send(device.pushToken, notification, ttl);
    if (ticket.status === 'unregistered') {
      await this.devices.invalidateTokenIfCurrent(device, 'push');
      return;
    }

    await this.scheduleReceiptCheck(ticket.receiptId, device.id, target.fingerprint);
  }

  async checkReceipt(job: NativePushReceiptJob): Promise<void> {
    const status = await this.client.receipt(job.receiptId);
    if (status === 'pending') throw new Error('Expo receipt is not available yet');

    if (status === 'unregistered') {
      await this.devices.invalidateTokenFromReceipt(job.deviceId, job.tokenFingerprint);
    }
  }

  // An unregistered device often shows up only in the receipt, not in the send ticket.
  private async scheduleReceiptCheck(receiptId: string, deviceId: string, fingerprint: string) {
    const expiresAt = Date.now() + RECEIPT_LIFETIME_MS;

    await this.jobs.enqueue<NativePushReceiptJob>(
      EXPO_RECEIPT_QUEUE,
      { receiptId, deviceId, tokenFingerprint: fingerprint },
      {
        id: jobId(receiptId),
        delay: RECEIPT_FIRST_CHECK_MS,
        attempts: RECEIPT_CHECKS,
        backoff: { type: 'fixed', delay: RECEIPT_RECHECK_MS },
        expiresAt,
      },
    );
  }
}
