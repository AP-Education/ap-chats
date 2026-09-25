import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { SocketIoRealtimePublisher } from '../../globals/realtime/socket-io-realtime.publisher';
import type { ConnectSocket } from '../auth/connect-socket';
import { SocketAuthService } from '../auth/socket-auth.service';
import { BootstrapService } from './bootstrap.service';

@WebSocketGateway({ namespace: '/connect' })
export class BootstrapGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly auth: SocketAuthService,
    private readonly bootstrap: BootstrapService,
    private readonly publisher: SocketIoRealtimePublisher,
  ) {}

  afterInit(namespace: Namespace): void {
    this.publisher.bind(namespace);
    namespace.use((socket, next) => {
      void this.auth.authenticate(socket as ConnectSocket, next);
    });
  }

  handleConnection(socket: ConnectSocket): Promise<void> {
    return this.bootstrap.connect(socket);
  }

  handleDisconnect(socket: ConnectSocket): void {
    this.bootstrap.disconnect(socket);
  }
}
