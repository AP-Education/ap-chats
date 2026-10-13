import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';

import { RealtimePublisher } from './realtime.publisher';
import { RealtimeRooms } from './realtime-rooms';

type WatcherData = { principal?: { sub: string } };

@Injectable()
export class SocketIoRealtimePublisher extends RealtimePublisher {
  private namespace?: Namespace;

  bind(namespace: Namespace): void {
    this.namespace = namespace;
  }

  toUser(userId: string, event: string, payload: unknown): void {
    this.requireNamespace().to(RealtimeRooms.user(userId)).emit(event, payload);
  }

  async toWatchers(
    room: string,
    event: string,
    payload: unknown,
    admit: (userIds: string[]) => Promise<string[]>,
  ): Promise<void> {
    const sockets = await this.requireNamespace().in(room).fetchSockets();
    const userIdOf = (socket: (typeof sockets)[number]) =>
      (socket.data as WatcherData).principal?.sub;

    const watcherIds = [...new Set(sockets.map(userIdOf).filter((id) => id !== undefined))];
    const admitted = new Set(await admit(watcherIds));

    for (const socket of sockets) {
      const userId = userIdOf(socket);
      const isAdmitted = userId !== undefined && admitted.has(userId);
      if (isAdmitted) socket.emit(event, payload);
      else await socket.leave(room);
    }
  }

  private requireNamespace(): Namespace {
    if (!this.namespace) throw new Error('Realtime gateway is not ready');
    return this.namespace;
  }
}
