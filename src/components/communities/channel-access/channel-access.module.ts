import { Module } from '@nestjs/common';

import { ChannelAccessPolicyModule } from './channel-access';
import { ChannelPermissionsModule } from './permissions';
import { ChannelAccessSyncModule } from './sync';

/** Brings channel access into the communities component; others import the part they use. */
@Module({
  imports: [ChannelAccessPolicyModule, ChannelPermissionsModule, ChannelAccessSyncModule],
})
export class ChannelAccessModule {}
