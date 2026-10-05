import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { DrizzleModule } from '@/database/drizzle';

import { DrizzleWebPushRepository } from './browser/repository/drizzle-web-push.repository';
import { WebPushRepository } from './browser/repository/web-push.repository';
import { WebPushController } from './browser/web-push.controller';
import { WebPushService } from './browser/web-push.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DevicesRepository, DrizzleDevicesRepository } from './repository';
import { BrowserPushTargetsStrategy } from './targets/browser-push-targets.strategy';
import { NativePushTargetsStrategy } from './targets/native-push-targets.strategy';
import { PushTargetsService } from './targets/push-targets.service';

@Module({
  imports: [DrizzleModule, AuthModule],
  controllers: [DevicesController, WebPushController],
  providers: [
    WebPushService,
    { provide: WebPushRepository, useClass: DrizzleWebPushRepository },
    DevicesService,
    PushTargetsService,
    NativePushTargetsStrategy,
    BrowserPushTargetsStrategy,
    { provide: DevicesRepository, useClass: DrizzleDevicesRepository },
  ],
  exports: [
    DevicesService,
    PushTargetsService,
    NativePushTargetsStrategy,
    BrowserPushTargetsStrategy,
  ],
})
export class DevicesModule {}
