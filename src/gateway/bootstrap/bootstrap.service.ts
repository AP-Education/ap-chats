import { Injectable } from '@nestjs/common';

import { Logger } from '../../globals/logger/logger.interface';
import { RealtimeRooms } from '../../globals/realtime/realtime-rooms';
import type { ConnectSocket } from '../auth/connect-socket';
import { SocketAuthService } from '../auth/socket-auth.service';

@Injectable()
export class BootstrapService {
  constructor(
    private readonly auth: SocketAuthService,
    private readonly logger: Logger,
  ) {}

  async connect(socket: ConnectSocket): Promise<void> {
    const principal = socket.data.principal;
    if (!principal || !socket.data.expiresAt) {
      socket.disconnect(true);
      return;
    }

    try {
      await socket.join(RealtimeRooms.user(principal.appId, principal.sub));
      this.auth.scheduleExpiry(socket);
      socket.emit('session:ready', { userId: principal.sub, appId: principal.appId });
    } catch (error) {
      this.logger
        .child({ socketId: socket.id })
        .error({ err: error }, 'Realtime connection setup failed');
      socket.disconnect(true);
    }
  }

  disconnect(socket: ConnectSocket): void {
    this.auth.clearExpiry(socket);
  }
}
