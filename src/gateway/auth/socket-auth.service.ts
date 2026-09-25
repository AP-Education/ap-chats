import { Injectable } from '@nestjs/common';

import { AccountsTokenVerifier } from '../../components/auth/accounts-token-verifier.service';
import { Logger } from '../../globals/logger/logger.interface';
import type { ConnectSocket } from './connect-socket';

type SocketAuthErrorCode = 'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_INVALID';

function authError(code: SocketAuthErrorCode): Error {
  const error = new Error(
    code === 'AUTH_TOKEN_EXPIRED' ? 'Access token expired' : 'Invalid access token',
  ) as Error & {
    data?: { code: SocketAuthErrorCode };
  };
  error.data = { code };
  return error;
}

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly tokens: AccountsTokenVerifier,
    private readonly logger: Logger,
  ) {}

  async authenticate(socket: ConnectSocket, next: (error?: Error) => void): Promise<void> {
    const token: unknown = socket.handshake.auth.token;
    if (typeof token !== 'string' || !token || token.length > 16_384) {
      next(authError('AUTH_TOKEN_MISSING'));
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
      next(authError(expired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID'));
    }
  }

  scheduleExpiry(socket: ConnectSocket): void {
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

  clearExpiry(socket: ConnectSocket): void {
    if (socket.data.expiryTimer) clearTimeout(socket.data.expiryTimer);
  }
}
