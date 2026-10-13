import { Module } from '@nestjs/common';

import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { ChannelAudienceModule } from '../../channel-audience';
import { ChannelAccessNoticesGateway } from './channel-access-notices.gateway';
import { ChannelAccessNotices } from './channel-access-notices.service';

/** Tells people over the socket what a recalculation changed for them. */
@Module({
  imports: [WorkspaceMembersModule, ChannelAudienceModule],
  providers: [ChannelAccessNotices, ChannelAccessNoticesGateway],
})
export class ChannelAccessNoticesModule {}
