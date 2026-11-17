import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { CompatController, CompatService } from './compat';
import { ExpoManifestController, ExpoManifestService } from './expo';
import { DrizzleUpdatesRepository, UpdatesRepository } from './repository';

@Module({
  imports: [DrizzleModule],
  controllers: [CompatController, ExpoManifestController],
  providers: [
    CompatService,
    ExpoManifestService,
    { provide: UpdatesRepository, useClass: DrizzleUpdatesRepository },
  ],
})
export class UpdatesModule {}
