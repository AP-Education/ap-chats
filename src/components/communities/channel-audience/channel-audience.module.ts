import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { ChannelAudienceFacade } from './channel-audience.facade';
import { ChannelAudienceRepository } from './repository/channel-audience.repository';
import { DrizzleChannelAudienceRepository } from './repository/drizzle-channel-audience.repository';

@Module({
  imports: [DrizzleModule],
  providers: [
    ChannelAudienceFacade,
    { provide: ChannelAudienceRepository, useClass: DrizzleChannelAudienceRepository },
  ],
  exports: [ChannelAudienceFacade],
})
export class ChannelAudienceModule {}
