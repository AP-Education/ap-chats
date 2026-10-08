import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import { IntegrationEvents } from './integration-events';
import { EventOutboxRepository } from './repository/event-outbox.repository';

const OUTBOX_BATCH_SIZE = 100;

@Injectable()
export class OutboxDispatcher implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly repository: EventOutboxRepository,
    private readonly events: IntegrationEvents,
    private readonly config: AppConfigService,
    private readonly logger: Logger,
  ) {}

  // After every module has subscribed, or the first events would find nobody to deliver to.
  onApplicationBootstrap(): void {
    if (!this.config.get('PUSH_WORKER_ENABLED')) return;

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
      const event = claimed[index]!;

      try {
        await this.events.deliver(event);
        await this.repository.acknowledge(event.id);
      } catch (error) {
        await this.repository.release(claimed.slice(index).map((unsent) => unsent.id));
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
