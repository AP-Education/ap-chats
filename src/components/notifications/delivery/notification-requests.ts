import { Injectable, Module } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { jobId } from '@/globals/jobs/job-id';
import { JobQueue } from '@/globals/jobs/job-queue';

import { type ConversationAlert, PUSH_ALERT_DUE_QUEUE } from './types';

/** The way into delivery: the chat side says who should hear about what, delivery decides when. */
@Injectable()
export class NotificationRequests {
  constructor(
    private readonly jobs: JobQueue,
    private readonly config: AppConfigService,
  ) {}

  // A burst for one person and conversation waits a moment and becomes a single alert.
  async requestConversationAlerts(alerts: ConversationAlert[]): Promise<void> {
    const coalesceMs = this.config.get('PUSH_COALESCE_SECONDS') * 1000;

    await this.jobs.enqueueMany(
      PUSH_ALERT_DUE_QUEUE,
      alerts.map((alert) => ({
        data: alert,
        options: {
          id: alert.id,
          delay: coalesceMs,
          expiresAt: Date.parse(alert.expiresAt),
          deduplication: { id: jobId(`${alert.userId}:${alert.channelId}`), ttl: coalesceMs },
        },
      })),
    );
  }
}

@Module({ providers: [NotificationRequests], exports: [NotificationRequests] })
export class NotificationRequestsModule {}
