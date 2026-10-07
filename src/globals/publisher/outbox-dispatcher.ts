import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';
import { Logger } from '@/globals/logger';

import { EventOutboxRepository } from './repository/event-outbox.repository';

const OUTBOX_BATCH_SIZE = 100;

@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly repository: EventOutboxRepository,
    private readonly jobs: JobQueue,
    private readonly config: AppConfigService,
    private readonly logger: Logger,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;
    this.tick();
  }

  private tick(): void {
    this.pending = this.relay()
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Outbox relay failed');
        return 0;
      })
      .then((relayed) => {
        // A full batch means a backlog, so the next one goes out without the idle pause.
        const idleMs = relayed >= OUTBOX_BATCH_SIZE ? 0 : 1000;
        if (!this.stopped) this.timer = setTimeout(() => this.tick(), idleMs);
      });
  }

  async relay(): Promise<number> {
    const claimed = await this.repository.claim(OUTBOX_BATCH_SIZE);
    for (let index = 0; index < claimed.length; index++) {
      const row = claimed[index]!;
      try {
        await this.jobs.enqueue(row.name, row.payload, {
          id: row.id,
          priority: row.priority,
          expiresAt: row.expiresAt.getTime(),
        });
        await this.repository.acknowledge(row.id);
      } catch (error) {
        await this.repository.release(claimed.slice(index).map((event) => event.id));
        throw error;
      }
    }
    await this.repository.purgeExpired();

    return claimed.length;
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.pending;
  }
}
