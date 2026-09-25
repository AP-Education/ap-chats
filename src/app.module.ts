import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from '@/components/auth';
import { BootstrapModule } from '@/components/bootstrap/bootstrap.module';
import { DevicesModule } from '@/components/devices/devices.module';
import { DrizzleModule } from '@/database/drizzle';
import { AppConfigModule } from '@/globals/config';
import { HttpExceptionFilter } from '@/globals/filters/http-exception.filter';
import { LoggerModule } from '@/globals/logger';
import { HealthController } from '@/health/health.controller';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DrizzleModule,
    AuthModule,
    DevicesModule,
    BootstrapModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
