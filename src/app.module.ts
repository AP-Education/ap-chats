import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from './components/auth/auth.module';
import { DevicesModule } from './components/devices/devices.module';
import { DrizzleModule } from './database/drizzle';
import { AppConfigModule } from './globals/config/config.module';
import { HttpExceptionFilter } from './globals/filters/http-exception.filter';
import { AppLoggerModule } from './globals/logger/logger.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [AppConfigModule, AppLoggerModule, DrizzleModule, AuthModule, DevicesModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
