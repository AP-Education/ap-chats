import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from './components/auth/auth.module';
import { DevicesModule } from './components/devices/devices.module';
import { DrizzleModule } from './database/drizzle';
import { GatewayModule } from './gateway/gateway.module';
import { AppConfigModule } from './globals/config/config.module';
import { HttpExceptionFilter } from './globals/filters/http-exception.filter';
import { LoggerModule } from './globals/logger/logger.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [AppConfigModule, LoggerModule, DrizzleModule, AuthModule, DevicesModule, GatewayModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
