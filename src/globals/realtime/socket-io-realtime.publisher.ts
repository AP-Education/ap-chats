import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';

import { RealtimePublisher } from './realtime.publisher';
import { RealtimeRooms } from './realtime-rooms';

@Injectable()
export class SocketIoRealtimePublisher extends RealtimePublisher {
  private namespace?: Namespace;

  bind(namespace: Namespace): void {
    this.namespace = namespace;
  }

  toUser(appId: string, userId: string, event: string, payload: unknown): void {
    this.requireNamespace().to(RealtimeRooms.user(appId, userId)).emit(event, payload);
  }

  toConversation(appId: string, conversationId: string, event: string, payload: unknown): void {
    this.requireNamespace()
      .to(RealtimeRooms.conversation(appId, conversationId))
      .emit(event, payload);
  }

  private requireNamespace(): Namespace {
    if (!this.namespace) throw new Error('Realtime gateway is not ready');
    return this.namespace;
  }
}
