import { Module } from '@nestjs/common';

import { AppConfigModule } from './globals/config/config.module';
import { AppLoggerModule } from './globals/logger/logger.module';
import { HealthController } from './health/health.controller';

@Module({ imports: [AppConfigModule, AppLoggerModule], controllers: [HealthController] })
export class AppModule {}
