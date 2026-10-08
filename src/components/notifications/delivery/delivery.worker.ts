import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AttentionRepository } from '@/components/attention';
import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';

import { NotificationChannelRegistry } from './channels/notification-channel.registry';
import { NotificationContent } from './notification-content';
import type { DeliveryJob } from './types';

@Injectable()
export class DeliveryWorker implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly channels: NotificationChannelRegistry,
    private readonly content: NotificationContent,
    private readonly attention: AttentionRepository,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.runsPushWorkers()) return;

    for (const channel of this.channels.all) {
      this.jobs.work<DeliveryJob>(channel.delivery.queue, (job) => this.deliver(job), {
        concurrency: this.config.get('PUSH_WORKER_CONCURRENCY'),
        rateLimit: channel.delivery.rateLimit,
      });
    }
  }

  // Rendered at send time: a message read, deleted or muted meanwhile is never announced.
  async deliver({ request, target }: DeliveryJob): Promise<void> {
    const secondsLeft = secondsUntil(request.expiresAt);
    if (secondsLeft <= 0) return;

    // Someone looking at the app on any device hears it there; a push on top would be a second alert.
    if (await this.attention.isAttending(request.userId)) return;

    const notification = await this.content.render(request);
    if (!notification) return;

    await this.channels.resolve(target.channel).send(target, notification, secondsLeft);
  }
}

function secondsUntil(time: string): number {
  return Math.ceil((Date.parse(time) - Date.now()) / 1000);
}
