import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { DrizzlePushAudienceRepository } from './repository/drizzle-push-audience.repository';
import { PushAudienceRepository } from './repository/push-audience.repository';

@Module({
  imports: [DrizzleModule],
  providers: [{ provide: PushAudienceRepository, useClass: DrizzlePushAudienceRepository }],
  exports: [PushAudienceRepository],
})
export class NotificationAudienceModule {}
