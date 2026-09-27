import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { ChannelMembershipsRepository, DrizzleChannelMembershipsRepository } from './repository';

@Module({
  imports: [DrizzleModule],
  providers: [
    { provide: ChannelMembershipsRepository, useClass: DrizzleChannelMembershipsRepository },
  ],
  exports: [ChannelMembershipsRepository],
})
export class ChannelMembershipsRepositoryModule {}
