import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { PinsController } from './pins.controller';
import { PinsFacade } from './pins.facade';
import { PinsGateway } from './pins.gateway';
import { DrizzlePinsRepository } from './repository/drizzle-pins.repository';
import { PinsRepository } from './repository/pins.repository';

@Module({
  imports: [AuthModule, ChannelAccessPolicyModule, ChannelAudienceModule, WorkspaceMembersModule],
  controllers: [PinsController],
  providers: [
    PinsFacade,
    PinsGateway,
    { provide: PinsRepository, useClass: DrizzlePinsRepository },
  ],
  exports: [PinsFacade],
})
export class PinsModule {}
