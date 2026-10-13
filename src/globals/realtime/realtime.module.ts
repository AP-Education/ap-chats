import { Global, Module } from '@nestjs/common';

import { RealtimePublisher } from './realtime.publisher';
import { SocketIoRealtimePublisher } from './socket-io-realtime.publisher';

// Socket delivery any component can use; rooms and payloads belong to the component that sends them.
@Global()
@Module({
  providers: [
    SocketIoRealtimePublisher,
    { provide: RealtimePublisher, useExisting: SocketIoRealtimePublisher },
  ],
  exports: [RealtimePublisher, SocketIoRealtimePublisher],
})
export class RealtimeTransportModule {}
