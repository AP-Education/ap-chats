import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { JobsModule } from '@/globals/jobs/jobs.module';

import { EventOutbox } from './event-outbox';
import { EventPublisher, NestEventPublisher } from './event-publisher';
import { IntegrationEvents } from './integration-events';
import { OutboxDispatcher } from './outbox-dispatcher';
import { PersistentEventOutbox } from './persistent-event-outbox';
import { DrizzleEventOutboxRepository } from './repository/drizzle-event-outbox.repository';
import { EventOutboxRepository } from './repository/event-outbox.repository';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot(), JobsModule],
  providers: [
    IntegrationEvents,
    OutboxDispatcher,
    { provide: EventOutboxRepository, useClass: DrizzleEventOutboxRepository },
    { provide: EventOutbox, useClass: PersistentEventOutbox },
    { provide: EventPublisher, useClass: NestEventPublisher },
  ],
  exports: [EventPublisher, EventOutbox, IntegrationEvents],
})
export class PublisherModule {}
