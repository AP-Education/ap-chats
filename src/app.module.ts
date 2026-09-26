import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from '@/components/auth';
import { BootstrapModule } from '@/components/bootstrap';
import { CommunitiesModule } from '@/components/communities';
import { DevicesModule } from '@/components/devices';
import { UploadsModule } from '@/components/uploads';
import { WorkspacesModule } from '@/components/workspaces';
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
    UploadsModule,
    WorkspacesModule,
    CommunitiesModule,
    BootstrapModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
