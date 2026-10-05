import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';

import { MessageDeliveryRegistry } from './delivery';
import { MessageNotificationContentService } from './message-notification-content.service';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';
import type { MessageDeliveryJob } from './types';

@Injectable()
export class MessageDeliveryWorker implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly deliveries: MessageDeliveryRegistry,
    private readonly windows: NotificationWindowsRepository,
    private readonly config: AppConfigService,
    private readonly content: MessageNotificationContentService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    const concurrency = this.config.get('PUSH_WORKER_CONCURRENCY');
    for (const delivery of this.deliveries.all) {
      this.jobs.work<MessageDeliveryJob>(delivery.queueName, (job) => this.deliver(job), {
        concurrency,
        rateLimit: delivery.rateLimit,
      });
    }
  }

  async deliver(job: MessageDeliveryJob): Promise<void> {
    const alert = job.alert;
    const latest = await this.windows.latest(alert.userId, alert.channelId);
    if (latest?.id !== alert.id) return;

    const ttl = Math.ceil((Date.parse(alert.expiresAt) - Date.now()) / 1000);
    if (ttl <= 0) return;

    const envelope = await this.content.buildNotification(alert);
    if (!envelope) return;

    await this.deliveries.resolve(job.target.kind).send(job.target, envelope, ttl);
  }
}
