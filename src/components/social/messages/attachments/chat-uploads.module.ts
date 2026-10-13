import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { StorageModule } from '@/components/uploads/storage/storage.module';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { AttachmentPreviewService } from './attachment-preview.service';
import { ChatUploadsController } from './chat-uploads.controller';
import { ChatUploadsService } from './chat-uploads.service';
import { ChatUploadsRepository, DrizzleChatUploadsRepository } from './repository';
import { UploadCleanupService } from './upload-cleanup.service';
import { UploadPolicy } from './upload-policy';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, ChannelAccessPolicyModule, StorageModule],
  controllers: [ChatUploadsController],
  providers: [
    ChatUploadsService,
    { provide: ChatUploadsRepository, useClass: DrizzleChatUploadsRepository },
    AttachmentPreviewService,
    UploadPolicy,
    UploadCleanupService,
  ],
  exports: [ChatUploadsService],
})
export class ChatUploadsModule {}
