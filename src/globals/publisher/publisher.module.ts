import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { JobsModule } from '@/globals/jobs/jobs.module';

import { EventPublisher } from './event-publisher';
import { IntegrationEvents } from './integration-events';
import { OutboxDispatcher } from './outbox-dispatcher';
import { DrizzleEventOutboxRepository } from './repository/drizzle-event-outbox.repository';
import { EventOutboxRepository } from './repository/event-outbox.repository';
import { TransactionalEventPublisher } from './transactional-event-publisher';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot(), JobsModule],
  providers: [
    IntegrationEvents,
    OutboxDispatcher,
    { provide: EventOutboxRepository, useClass: DrizzleEventOutboxRepository },
    { provide: EventPublisher, useClass: TransactionalEventPublisher },
  ],
  exports: [EventPublisher, IntegrationEvents],
})
export class PublisherModule {}
