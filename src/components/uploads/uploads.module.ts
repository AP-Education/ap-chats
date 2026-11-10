import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';

import { ImageSanitizerService } from './image-sanitizer.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, ImageSanitizerService],
})
export class UploadsModule {}
