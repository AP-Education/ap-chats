import { Global, Module } from '@nestjs/common';

import { RealtimePublisher } from './realtime.publisher';
import { SocketIoRealtimePublisher } from './socket-io-realtime.publisher';

// Infrastructure shared by future chat and notification components.
@Global()
@Module({
  providers: [
    SocketIoRealtimePublisher,
    { provide: RealtimePublisher, useExisting: SocketIoRealtimePublisher },
  ],
  exports: [RealtimePublisher, SocketIoRealtimePublisher],
})
export class RealtimeTransportModule {}
