import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { ChannelAccessPolicy } from './channel-access.policy';
import { ChannelAccessRepository } from './repository/channel-access.repository';
import { DrizzleChannelAccessRepository } from './repository/drizzle-channel-access.repository';

/** The checks other modules run before touching a channel's content. */
@Module({
  imports: [DrizzleModule],
  providers: [
    ChannelAccessPolicy,
    { provide: ChannelAccessRepository, useClass: DrizzleChannelAccessRepository },
  ],
  exports: [ChannelAccessPolicy],
})
export class ChannelAccessPolicyModule {}
