import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, type UploadedMultipartFile } from '@nestjs/platform-fastify';

import { type AuthenticatedUser, AuthGuard, CurrentUser } from '@/components/auth';

import type { UploadedFileResult } from './uploads.service';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedMultipartFile | undefined,
  ): Promise<UploadedFileResult> {
    if (!file?.buffer) throw new BadRequestException('file is required');
    return this.uploads.upload(user.sub, file.buffer);
  }
}
