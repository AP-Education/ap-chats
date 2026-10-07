import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';

import { NotificationChannelRegistry } from './channels/notification-channel.registry';
import { NotificationContent } from './notification-content';
import type { MessageDeliveryJob } from './types';

@Injectable()
export class MessageDeliveryWorker implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly channels: NotificationChannelRegistry,
    private readonly content: NotificationContent,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    for (const channel of this.channels.all) {
      this.jobs.work<MessageDeliveryJob>(channel.delivery.queue, (job) => this.deliver(job), {
        concurrency: this.config.get('PUSH_WORKER_CONCURRENCY'),
        rateLimit: channel.delivery.rateLimit,
      });
    }
  }

  // Rendered at send time: a message read, deleted or muted meanwhile is never announced.
  async deliver({ alert, target }: MessageDeliveryJob): Promise<void> {
    const ttl = Math.ceil((Date.parse(alert.expiresAt) - Date.now()) / 1000);
    if (ttl <= 0) return;

    const notification = await this.content.render(alert);
    if (!notification) return;

    await this.channels.resolve(target.channel).send(target, notification, ttl);
  }
}
