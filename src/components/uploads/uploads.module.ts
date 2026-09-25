import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';

import { ImageSanitizerService } from './image-sanitizer.service';
import { StorageModule } from './storage';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [UploadsController],
  providers: [UploadsService, ImageSanitizerService],
})
export class UploadsModule {}
