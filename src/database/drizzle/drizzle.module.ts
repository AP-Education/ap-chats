import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../globals/config/config.module';
import { DrizzleService } from './drizzle.service';

@Module({
  imports: [AppConfigModule],
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DrizzleModule {}
