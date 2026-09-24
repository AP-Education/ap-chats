import { Module } from '@nestjs/common';

import { DrizzleModule } from '../../database/drizzle';
import { AuthModule } from '../auth/auth.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DevicesRepository, DrizzleDevicesRepository } from './repository';

@Module({
  imports: [DrizzleModule, AuthModule],
  controllers: [DevicesController],
  providers: [DevicesService, { provide: DevicesRepository, useClass: DrizzleDevicesRepository }],
})
export class DevicesModule {}
