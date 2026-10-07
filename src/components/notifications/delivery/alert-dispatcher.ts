import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';

import { NotificationChannelRegistry } from './channels/notification-channel.registry';
import { type DeliveryJob, type NotificationRequest, PUSH_ALERT_QUEUE } from './types';

/** Fans a request out to every place the person can be reached, one job per target. */
@Injectable()
export class AlertDispatcher implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly channels: NotificationChannelRegistry,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.runsPushWorkers()) return;

    this.jobs.work<NotificationRequest>(PUSH_ALERT_QUEUE, (request) => this.dispatch(request));
  }

  // Each target gets its own job, so a slow or failing transport never delays or repeats another.
  async dispatch(request: NotificationRequest): Promise<void> {
    const targets = await this.channels.listTargets(request.userId);

    for (const target of targets) {
      await this.jobs.enqueue<DeliveryJob>(
        this.channels.resolve(target.channel).delivery.queue,
        { request, target },
        {
          id: `${request.id}:${target.channel}:${target.id}:${target.fingerprint}`,
          expiresAt: Date.parse(request.expiresAt),
        },
      );
    }
  }
}
