import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { MessagesModule } from '../messages';
import { AttachmentDownloadsService } from './attachment-downloads.service';
import { AttachmentLinksService } from './attachment-links.service';
import { ChatUploadsController } from './chat-uploads.controller';
import { ChatUploadsRepository } from './repository/chat-uploads.repository';
import { DrizzleChatUploadsRepository } from './repository/drizzle-chat-uploads.repository';
import { UploadCleanupService } from './upload-cleanup.service';
import { UploadCompletionService } from './upload-completion.service';
import { UploadPolicy } from './upload-policy';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, ChannelAccessPolicyModule, MessagesModule],
  controllers: [ChatUploadsController],
  providers: [
    UploadsService,
    UploadCompletionService,
    AttachmentDownloadsService,
    AttachmentLinksService,
    UploadPolicy,
    UploadCleanupService,
    { provide: ChatUploadsRepository, useClass: DrizzleChatUploadsRepository },
  ],
  exports: [UploadsService, AttachmentLinksService],
})
export class AttachmentsModule {}
