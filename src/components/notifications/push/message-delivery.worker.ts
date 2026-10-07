import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';

import { NotificationChannelRegistry } from './channels/notification-channel.registry';
import { MessageNotificationContentService } from './message-notification-content.service';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';
import type { MessageDeliveryJob } from './types';

@Injectable()
export class MessageDeliveryWorker implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly channels: NotificationChannelRegistry,
    private readonly windows: NotificationWindowsRepository,
    private readonly config: AppConfigService,
    private readonly content: MessageNotificationContentService,
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

  async deliver({ alert, target }: MessageDeliveryJob): Promise<void> {
    // A newer alert for this conversation replaces this one, so only the latest is sent.
    const latest = await this.windows.latest(alert.userId, alert.channelId);
    if (latest?.id !== alert.id) return;

    const ttl = Math.ceil((Date.parse(alert.expiresAt) - Date.now()) / 1000);
    if (ttl <= 0) return;

    const notification = await this.content.buildNotification(alert);
    if (!notification) return;

    await this.channels.resolve(target.channel).send(target, notification, ttl);
  }
}
