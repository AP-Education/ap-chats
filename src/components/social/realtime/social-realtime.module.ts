import { Module } from '@nestjs/common';

import { ChannelAccessModule } from '@/components/communities/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { WorkspacesModule } from '@/components/workspaces';
import { RealtimeTransportModule } from '@/globals/realtime';

import { ChannelBroadcast } from './channel-broadcast';
import { ChannelWatchService } from './channel-watch.service';
import { SocialEventsRelay } from './social-events.relay';
import { SocialRealtimeGateway } from './social-realtime.gateway';

@Module({
  imports: [RealtimeTransportModule, WorkspacesModule, ChannelAccessModule, ChannelAudienceModule],
  providers: [ChannelBroadcast, ChannelWatchService, SocialRealtimeGateway, SocialEventsRelay],
  exports: [ChannelBroadcast],
})
export class SocialRealtimeModule {}
