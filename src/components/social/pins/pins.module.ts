import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { WorkspacesModule } from '@/components/workspaces';

import { MessagesModule } from '../messages';
import { PinsController } from './pins.controller';
import { PinsService } from './pins.service';
import { DrizzlePinsRepository } from './repository/drizzle-pins.repository';
import { PinsRepository } from './repository/pins.repository';

@Module({
  imports: [AuthModule, WorkspacesModule, ChannelAccessModule, MessagesModule],
  controllers: [PinsController],
  providers: [PinsService, { provide: PinsRepository, useClass: DrizzlePinsRepository }],
  exports: [PinsService],
})
export class PinsModule {}
