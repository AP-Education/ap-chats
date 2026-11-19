import { Module } from '@nestjs/common';

import { DrizzleModule } from '@/database/drizzle';

import { AdminUpdatesController, AdminUpdatesService } from './admin';
import { CompatController, CompatService } from './compat';
import { ExpoManifestController, ExpoManifestService } from './expo';
import { LaunchesController, LaunchesService } from './launches';
import { DrizzleUpdatesRepository, UpdatesRepository } from './repository';

@Module({
  imports: [DrizzleModule],
  controllers: [
    CompatController,
    ExpoManifestController,
    LaunchesController,
    AdminUpdatesController,
  ],
  providers: [
    AdminUpdatesService,
    CompatService,
    ExpoManifestService,
    LaunchesService,
    { provide: UpdatesRepository, useClass: DrizzleUpdatesRepository },
  ],
})
export class UpdatesModule {}
