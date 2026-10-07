import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { jobId } from '@/globals/jobs/job-id';
import { JobQueue } from '@/globals/jobs/job-queue';

import { NotificationChannelRegistry } from './channels/notification-channel.registry';
import { type ConversationAlert, type MessageDeliveryJob, PUSH_ALERT_DUE_QUEUE } from './types';

/** Fans a due alert out to every place the person can be reached, one job per target. */
@Injectable()
export class AlertDispatcher implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly channels: NotificationChannelRegistry,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    this.jobs.work<ConversationAlert>(PUSH_ALERT_DUE_QUEUE, (alert) => this.dispatch(alert));
  }

  // Each target gets its own job, so a slow or failing transport never delays or repeats another.
  async dispatch(alert: ConversationAlert): Promise<void> {
    const targets = await this.channels.listTargets(alert.userId);

    for (const target of targets) {
      await this.jobs.enqueue<MessageDeliveryJob>(
        this.channels.resolve(target.channel).delivery.queue,
        { alert, target },
        {
          id: jobId(`${alert.id}:${target.channel}:${target.id}:${target.fingerprint}`),
          expiresAt: Date.parse(alert.expiresAt),
        },
      );
    }
  }
}
