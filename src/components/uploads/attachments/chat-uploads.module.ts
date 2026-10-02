import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { WorkspacesModule } from '@/components/workspaces';

import { StorageModule } from '../storage/storage.module';
import { AttachmentPreviewService } from './attachment-preview.service';
import { ChatUploadsController } from './chat-uploads.controller';
import { ChatUploadsService } from './chat-uploads.service';
import { UploadCleanupService } from './upload-cleanup.service';
import { UploadPolicy } from './upload-policy';
import { ChatUploadsRepository } from './uploads.repository';

@Module({
  imports: [AuthModule, WorkspacesModule, ChannelAccessModule, StorageModule],
  controllers: [ChatUploadsController],
  providers: [
    ChatUploadsService,
    ChatUploadsRepository,
    AttachmentPreviewService,
    UploadPolicy,
    UploadCleanupService,
  ],
  exports: [ChatUploadsService],
})
export class ChatUploadsModule {}
