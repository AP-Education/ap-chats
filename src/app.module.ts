import { Module } from '@nestjs/common';

import { AuthModule } from './components/auth/auth.module';
import { DrizzleModule } from './database/drizzle';
import { AppConfigModule } from './globals/config/config.module';
import { AppLoggerModule } from './globals/logger/logger.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [AppConfigModule, AppLoggerModule, DrizzleModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
