import { Injectable, Module } from '@nestjs/common';

import { JobQueue } from '@/globals/jobs/job-queue';

import { type NotificationRequest, PUSH_ALERT_QUEUE } from './types';

/** The way into delivery: a requester names who should hear about something. */
@Injectable()
export class NotificationRequests {
  constructor(private readonly jobs: JobQueue) {}

  async request(requests: NotificationRequest[]): Promise<void> {
    await this.jobs.enqueueMany(
      PUSH_ALERT_QUEUE,
      requests.map((request) => ({
        data: request,
        options: { id: request.id, expiresAt: Date.parse(request.expiresAt) },
      })),
    );
  }
}

@Module({ providers: [NotificationRequests], exports: [NotificationRequests] })
export class NotificationRequestsModule {}
