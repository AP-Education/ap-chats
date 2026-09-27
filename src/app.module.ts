import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from '@/components/auth';
import { BootstrapModule } from '@/components/bootstrap';
import { CommunitiesModule } from '@/components/communities';
import { DevicesModule } from '@/components/devices';
import { DirectMessagesModule } from '@/components/direct-messages/direct-messages.module';
import { SocialModule } from '@/components/social/social.module';
import { UploadsModule } from '@/components/uploads';
import { UserProfilesModule } from '@/components/user-profiles/user-profiles.module';
import { WorkspacesModule } from '@/components/workspaces';
import { DrizzleModule } from '@/database/drizzle';
import { TransactionalDrizzleModule } from '@/database/drizzle/transactional-drizzle.module';
import { AppConfigModule } from '@/globals/config';
import { HttpExceptionFilter } from '@/globals/filters/http-exception.filter';
import { LoggerModule } from '@/globals/logger';
import { PublisherModule } from '@/globals/publisher/publisher.module';
import { HealthController } from '@/health/health.controller';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DrizzleModule,
    TransactionalDrizzleModule,
    PublisherModule,
    AuthModule,
    UserProfilesModule,
    DevicesModule,
    DirectMessagesModule,
    UploadsModule,
    WorkspacesModule,
    CommunitiesModule,
    SocialModule,
    BootstrapModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
