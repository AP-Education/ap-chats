import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../globals/config/config.module';
import { DrizzleService } from './drizzle.service';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');

@Module({
  imports: [AppConfigModule],
  providers: [
    DrizzleService,
    {
      provide: DRIZZLE_DB,
      useFactory: (drizzle: DrizzleService) => drizzle.db,
      inject: [DrizzleService],
    },
  ],
  exports: [DrizzleService, DRIZZLE_DB],
})
export class DrizzleModule {}
