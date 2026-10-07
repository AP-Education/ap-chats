import { Injectable } from '@nestjs/common';

import { EventOutbox, type OutboxOptions } from './event-outbox';
import { EventOutboxRepository } from './repository/event-outbox.repository';

@Injectable()
export class PersistentEventOutbox extends EventOutbox {
  constructor(private readonly repository: EventOutboxRepository) {
    super();
  }

  async record<T extends object>(
    name: string,
    payload: T,
    options: OutboxOptions = {},
  ): Promise<void> {
    await this.repository.append({
      name,
      payload,
      priority: options.priority ?? 10,
      expiresAt: new Date(Date.now() + (options.expireInSeconds ?? 3600) * 1000),
    });
  }
}
