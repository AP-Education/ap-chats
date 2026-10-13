import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { ChannelsRepository, DrizzleChannelsRepository } from './repository';

/** The channel itself: its name, category and kind, and how a person sees it. */
@Module({
  imports: [DrizzleModule],
  providers: [{ provide: ChannelsRepository, useClass: DrizzleChannelsRepository }],
  exports: [ChannelsRepository],
})
export class ChannelsModule {}
