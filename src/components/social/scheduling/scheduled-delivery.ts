import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

import { Logger } from '@/globals/logger';

import { ScheduledMessagesRepository } from './repository';
import { SendScheduledMessageService } from './send-scheduled-message.service';

const DUE_BATCH_SIZE = 50;
const IDLE_MS = 1000;

/**
 * Sends scheduled messages within about a second of their time. The table is the only schedule,
 * so changing or cancelling one needs no job to chase, and replicas share it by row locks.
 */
@Injectable()
export class ScheduledDelivery implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private pending: Promise<void> | undefined;

  constructor(
    private readonly repository: ScheduledMessagesRepository,
    private readonly sending: SendScheduledMessageService,
    private readonly logger: Logger,
  ) {}

  // After every module has subscribed, or the first messages would find nobody to deliver to.
  onApplicationBootstrap(): void {
    this.tick();
  }

  private tick(): void {
    this.pending = this.deliver()
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Scheduled delivery failed');
        return 0;
      })
      .then((settled) => {
        // A full batch means a backlog, so the next one goes out without the idle pause.
        const idleMs = settled >= DUE_BATCH_SIZE ? 0 : IDLE_MS;
        if (!this.stopped) this.timer = setTimeout(() => this.tick(), idleMs);
      });
  }

  async deliver(): Promise<number> {
    let settled = 0;

    for (const due of await this.repository.due(DUE_BATCH_SIZE)) {
      try {
        await this.sending.sendOnTime(due);
        settled += 1;
      } catch (err) {
        this.logger.error({ err, scheduledMessageId: due.id }, 'Scheduled message not sent');
      }
    }

    return settled;
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.pending;
  }
}
