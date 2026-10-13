import { Module } from '@nestjs/common';

import { ChannelAccessPolicyModule } from './channel-access';
import { ChannelAccessNoticesModule } from './notices';
import { ChannelPermissionsModule } from './permissions';
import { ChannelAccessSyncModule } from './sync';
import { ChannelVisibilityModule } from './visibility';

/** Brings channel access into the communities component; others import the part they use. */
@Module({
  imports: [
    ChannelAccessPolicyModule,
    ChannelVisibilityModule,
    ChannelPermissionsModule,
    ChannelAccessSyncModule,
    ChannelAccessNoticesModule,
  ],
})
export class ChannelAccessModule {}
