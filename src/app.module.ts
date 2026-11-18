import { StorageModule } from '@ap-education/storage';
import { MediaModule } from '@ap-education/storage/media';
import { createS3Storage, spacesOptions } from '@ap-education/storage/s3';
import { ThumbHashPlaceholder } from '@ap-education/storage/thumbhash';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from '@/components/auth';
import { BootstrapModule } from '@/components/bootstrap';
import { CallsModule } from '@/components/calls';
import { CommunitiesModule } from '@/components/communities';
import { DevicesModule } from '@/components/devices';
import { DirectMessagesModule } from '@/components/direct-messages';
import { NotificationsModule } from '@/components/notifications';
import { SocialModule } from '@/components/social';
import { StarMeModule } from '@/components/star-me';
import { UploadsModule } from '@/components/uploads';
import { UserProfilesModule } from '@/components/user-profiles/user-profiles.module';
import { VoipPushModule } from '@/components/voip-push';
import { WorkspacesModule } from '@/components/workspaces';
import { DrizzleModule } from '@/database/drizzle';
import { TransactionalDrizzleModule } from '@/database/drizzle/transactional-drizzle.module';
import { AppConfigModule, AppConfigService } from '@/globals/config';
import { HttpExceptionFilter } from '@/globals/filters/http-exception.filter';
import { LoggerModule } from '@/globals/logger';
import { PublisherModule } from '@/globals/publisher';
import { HealthController } from '@/health/health.controller';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DrizzleModule,
    TransactionalDrizzleModule,
    PublisherModule,
    StorageModule.forRootAsync({
      isGlobal: true,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        createS3Storage(
          spacesOptions({
            bucket: config.get('DIGITAL_OCEAN_SPACES_BUCKET'),
            endpoint: config.get('DIGITAL_OCEAN_SPACES_ENDPOINT'),
            accessKey: config.get('DIGITAL_OCEAN_SPACES_ACCESS_KEY'),
            secretKey: config.get('DIGITAL_OCEAN_SPACES_SECRET_KEY'),
          }),
        ),
    }),
    MediaModule.forRoot({ isGlobal: true, placeholder: new ThumbHashPlaceholder() }),
    AuthModule,
    UserProfilesModule,
    DevicesModule,
    DirectMessagesModule,
    NotificationsModule,
    UploadsModule,
    WorkspacesModule,
    CommunitiesModule,
    SocialModule,
    BootstrapModule,
    CallsModule,
    VoipPushModule,
    StarMeModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
