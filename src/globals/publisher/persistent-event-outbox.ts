import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';

import { EventOutbox, type OutboxOptions } from './event-outbox';
import { EventOutboxRepository } from './repository/event-outbox.repository';

@Injectable()
export class PersistentEventOutbox extends EventOutbox {
  constructor(
    private readonly repository: EventOutboxRepository,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async record<T extends object>(
    name: string,
    payload: T,
    options: OutboxOptions = {},
  ): Promise<void> {
    if (!this.config.get('PUSH_ENABLED')) return;
    await this.repository.append({
      ...(options.id ? { id: options.id } : {}),
      name,
      payload,
      priority: options.priority ?? 10,
      expiresAt: new Date(Date.now() + (options.expireInSeconds ?? 3600) * 1000),
    });
  }
}
