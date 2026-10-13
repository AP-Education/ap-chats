import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { MessagesModule } from '../messages';
import { PinsController } from './pins.controller';
import { PinsService } from './pins.service';
import { DrizzlePinsRepository } from './repository/drizzle-pins.repository';
import { PinsRepository } from './repository/pins.repository';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, ChannelAccessPolicyModule, MessagesModule],
  controllers: [PinsController],
  providers: [PinsService, { provide: PinsRepository, useClass: DrizzlePinsRepository }],
  exports: [PinsService],
})
export class PinsModule {}
