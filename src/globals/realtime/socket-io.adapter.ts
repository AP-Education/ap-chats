import { type INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

import type { AppConfigService } from '../config/config.service';

export class ConnectSocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly config: AppConfigService,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.config.get('WEB_ORIGIN') },
    } as ServerOptions);
  }
}
