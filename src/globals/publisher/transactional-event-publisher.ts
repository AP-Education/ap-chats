import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionHost } from '@nestjs-cls/transactional';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';

import { EventPublisher } from './event-publisher';
import { EventOutboxRepository } from './repository/event-outbox.repository';
import type { Announce, RecordOptions } from './types';

const DEFAULT_PRIORITY = 10;
const DEFAULT_EXPIRY_SECONDS = 3600;

/**
 * Listeners run synchronously in the caller's async context, so an event published inside a
 * transaction would hand them that transaction. Both rules below make that impossible.
 */
@Injectable()
export class TransactionalEventPublisher extends EventPublisher {
  constructor(
    private readonly emitter: EventEmitter2,
    private readonly outbox: EventOutboxRepository,
    private readonly txHost: TransactionHost<DrizzleTransactionAdapter>,
  ) {
    super();
  }

  publish<T extends object>(name: string, event: T): void {
    if (this.txHost.isTransactionActive())
      throw new Error(`${name} is published inside a transaction; record it instead`);

    this.emitter.emit(name, event);
  }

  async record<T extends object>(
    name: string,
    event: T,
    options: RecordOptions = {},
  ): Promise<Announce> {
    if (options.durable) await this.keepInOutbox(name, event, options);

    return () => this.publish(name, event);
  }

  private async keepInOutbox(name: string, payload: object, options: RecordOptions) {
    if (!this.txHost.isTransactionActive())
      throw new Error(`${name} is durable, so it must be recorded inside its transaction`);

    const expireInSeconds = options.expireInSeconds ?? DEFAULT_EXPIRY_SECONDS;
    await this.outbox.append({
      name,
      payload,
      priority: options.priority ?? DEFAULT_PRIORITY,
      expiresAt: new Date(Date.now() + expireInSeconds * 1000),
    });
  }
}
