import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { RealtimeTransportModule } from '@/globals/realtime';

import { BootstrapGateway } from './bootstrap.gateway';

@Module({
  imports: [AuthModule, RealtimeTransportModule],
  providers: [BootstrapGateway],
})
export class BootstrapModule {}
