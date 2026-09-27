import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export abstract class EventPublisher {
  abstract publish<T>(key: string, event: T): void;
}

@Injectable()
export class NestEventPublisher extends EventPublisher {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }
  publish<T>(key: string, event: T): void {
    this.emitter.emit(key, event);
  }
}
