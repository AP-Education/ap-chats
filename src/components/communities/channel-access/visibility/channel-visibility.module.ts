import { Module } from '@nestjs/common';

import { ChannelsModule } from '../../channels';
import { ChannelVisibility } from './channel-visibility.service';

@Module({
  imports: [ChannelsModule],
  providers: [ChannelVisibility],
  exports: [ChannelVisibility],
})
export class ChannelVisibilityModule {}
