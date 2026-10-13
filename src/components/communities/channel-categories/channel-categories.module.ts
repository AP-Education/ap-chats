import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { ChannelCategoriesController } from './channel-categories.controller';
import { ChannelCategoriesService } from './channel-categories.service';
import { ChannelCategoriesRepository, DrizzleChannelCategoriesRepository } from './repository';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, DrizzleModule],
  controllers: [ChannelCategoriesController],
  providers: [
    ChannelCategoriesService,
    { provide: ChannelCategoriesRepository, useClass: DrizzleChannelCategoriesRepository },
  ],
  exports: [ChannelCategoriesRepository],
})
export class ChannelCategoriesModule {}
