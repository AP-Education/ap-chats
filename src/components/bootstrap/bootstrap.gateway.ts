import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { AccountsTokenVerifier } from '@/components/auth';
import { Logger } from '@/globals/logger';
import { RealtimeRooms, SocketIoRealtimePublisher } from '@/globals/realtime';

import type { ConnectSocket } from './connect-socket.types';

type SocketAuthErrorCode = 'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_INVALID';

class SocketAuthError extends Error {
  readonly data: { code: SocketAuthErrorCode };

  constructor(code: SocketAuthErrorCode) {
    super(code === 'AUTH_TOKEN_EXPIRED' ? 'Access token expired' : 'Invalid access token');
    this.data = { code };
  }
}

@WebSocketGateway({ namespace: '/connect' })
export class BootstrapGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly tokens: AccountsTokenVerifier,
    private readonly publisher: SocketIoRealtimePublisher,
    private readonly logger: Logger,
  ) {}

  afterInit(namespace: Namespace): void {
    this.publisher.bind(namespace);
    namespace.use((socket, next) => {
      void this.authenticate(socket as ConnectSocket, next);
    });
  }

  async handleConnection(socket: ConnectSocket): Promise<void> {
    const principal = socket.data.principal;
    if (!principal || !socket.data.expiresAt) {
      socket.disconnect(true);
      return;
    }

    try {
      await socket.join(RealtimeRooms.user(principal.appId, principal.sub));
      this.scheduleExpiry(socket);
      socket.emit('session:ready', { userId: principal.sub, appId: principal.appId });
    } catch (error) {
      this.logger
        .child({ socketId: socket.id })
        .error({ err: error }, 'Realtime connection setup failed');
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: ConnectSocket): void {
    this.clearExpiry(socket);
  }

  private async authenticate(socket: ConnectSocket, next: (error?: Error) => void): Promise<void> {
    const token: unknown = socket.handshake.auth.token;
    if (typeof token !== 'string' || !token || token.length > 16_384) {
      next(new SocketAuthError('AUTH_TOKEN_MISSING'));
      return;
    }

    try {
      const { sub, appId, expiresAt } = await this.tokens.verifySession(token);
      socket.data.principal = { sub, appId };
      socket.data.expiresAt = expiresAt;
      next();
    } catch (error) {
      const expired =
        error instanceof Error &&
        (('code' in error && error.code === 'ERR_JWT_EXPIRED') || error.name === 'JWTExpired');
      this.logger
        .child({ socketId: socket.id })
        .warn({ err: error }, 'Realtime authentication failed');
      next(new SocketAuthError(expired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID'));
    }
  }

  private scheduleExpiry(socket: ConnectSocket): void {
    const remainingMs = (socket.data.expiresAt ?? 0) * 1000 - Date.now();
    if (remainingMs <= 0) {
      socket.emit('session:expired');
      socket.disconnect(true);
      return;
    }

    socket.data.expiryTimer = setTimeout(
      () => this.scheduleExpiry(socket),
      Math.min(remainingMs, 2_147_483_647),
    );
  }

  private clearExpiry(socket: ConnectSocket): void {
    if (socket.data.expiryTimer) clearTimeout(socket.data.expiryTimer);
  }
}
