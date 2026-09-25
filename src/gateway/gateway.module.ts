import { Module } from '@nestjs/common';

import { AuthModule } from '../components/auth/auth.module';
import { RealtimeTransportModule } from '../globals/realtime/realtime.module';
import { SocketAuthService } from './auth/socket-auth.service';
import { BootstrapGateway } from './bootstrap/bootstrap.gateway';
import { BootstrapService } from './bootstrap/bootstrap.service';

@Module({
  imports: [AuthModule, RealtimeTransportModule],
  providers: [BootstrapGateway, BootstrapService, SocketAuthService],
})
export class GatewayModule {}
