import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { ChannelsRepository, DrizzleChannelsRepository } from './repository';

@Module({
  imports: [DrizzleModule],
  providers: [{ provide: ChannelsRepository, useClass: DrizzleChannelsRepository }],
  exports: [ChannelsRepository],
})
export class ChannelsRepositoryModule {}
