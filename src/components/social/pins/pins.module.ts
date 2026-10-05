import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { WorkspacesModule } from '@/components/workspaces';

import { PinsController } from './pins.controller';
import { PinsFacade } from './pins.facade';
import { PinsGateway } from './pins.gateway';
import { DrizzlePinsRepository } from './repository/drizzle-pins.repository';
import { PinsRepository } from './repository/pins.repository';

@Module({
  imports: [AuthModule, ChannelAccessModule, ChannelAudienceModule, WorkspacesModule],
  controllers: [PinsController],
  providers: [
    PinsFacade,
    PinsGateway,
    { provide: PinsRepository, useClass: DrizzlePinsRepository },
  ],
  exports: [PinsFacade],
})
export class PinsModule {}
