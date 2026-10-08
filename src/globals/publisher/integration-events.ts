import { Injectable } from '@nestjs/common';

import { JobQueue, type WorkerOptions } from '@/globals/jobs/job-queue';

import type { StoredOutboxEvent } from './repository/event-outbox.repository';

/**
 * Durable events between modules: recorded in the producer's transaction, then copied to every
 * subscriber's own queue, so one consumer never takes another's copy. An external broker can
 * replace the queue behind this without changing producers or subscribers.
 */
@Injectable()
export class IntegrationEvents {
  private readonly subscribers = new Map<string, string[]>();

  constructor(private readonly jobs: JobQueue) {}

  subscribe<T extends object>(
    event: string,
    subscriber: string,
    handle: (event: T) => Promise<void>,
    options?: WorkerOptions,
  ): void {
    const current = this.subscribers.get(event) ?? [];
    this.subscribers.set(event, [...current, subscriber]);

    this.jobs.work<T>(subscriberQueue(event, subscriber), (payload) => handle(payload), options);
  }

  // Keyed by the outbox row, so relaying the same row again never delivers a second copy.
  async deliver(event: StoredOutboxEvent): Promise<void> {
    for (const subscriber of this.subscribers.get(event.name) ?? []) {
      await this.jobs.enqueue(subscriberQueue(event.name, subscriber), event.payload, {
        id: `${event.id}:${subscriber}`,
        priority: event.priority,
        expiresAt: event.expiresAt.getTime(),
      });
    }
  }
}

const subscriberQueue = (event: string, subscriber: string) => `${event}@${subscriber}`;
