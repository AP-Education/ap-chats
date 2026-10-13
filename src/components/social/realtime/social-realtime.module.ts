import { Module } from '@nestjs/common';

import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { RealtimeTransportModule } from '@/globals/realtime';

import { ChannelBroadcast } from './channel-broadcast';
import { ChannelWatchService } from './channel-watch.service';
import { SocialEventsRelay } from './social-events.relay';
import { SocialRealtimeGateway } from './social-realtime.gateway';

@Module({
  imports: [
    RealtimeTransportModule,
    WorkspaceMembersModule,
    ChannelAccessPolicyModule,
    ChannelAudienceModule,
  ],
  providers: [ChannelBroadcast, ChannelWatchService, SocialRealtimeGateway, SocialEventsRelay],
  exports: [ChannelBroadcast],
})
export class SocialRealtimeModule {}
