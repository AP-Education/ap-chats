import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EventPublisher, NestEventPublisher } from './event-publisher';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [{ provide: EventPublisher, useClass: NestEventPublisher }],
  exports: [EventPublisher],
})
export class PublisherModule {}
