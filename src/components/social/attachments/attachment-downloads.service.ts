import { Injectable, NotFoundException } from '@nestjs/common';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { StorageProvider } from '@/components/uploads/storage';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { MessagesService } from '../messages';
import type { MessageRef } from '../messages/types/message.types';
import { ChatUploadsRepository } from './repository/chat-uploads.repository';

export type DownloadVariant = 'download' | 'preview' | 'thumbnail';

@Injectable()
export class AttachmentDownloadsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly messages: MessagesService,
    private readonly repository: ChatUploadsRepository,
    private readonly storage: StorageProvider,
  ) {}

  async link(member: WorkspaceMember, message: MessageRef, id: string, variant: DownloadVariant) {
    await this.access.requireViewAccess(member, message.channelId);
    const { attachments } = await this.messages.requireLive(message);
    const file = attachments.find((attachment) => attachment.id === id);
    if (!file) throw new NotFoundException('Attachment not found');

    const upload = await this.repository.find(id);
    const isStored = upload?.state === 'attached' && upload.workspaceId === member.workspaceId;
    if (!isStored) throw new NotFoundException('Attachment not found');

    const isThumbnail = variant === 'thumbnail' && file.preview === 'image';
    const isInline = isThumbnail || (variant === 'preview' && file.preview !== null);
    const key = isThumbnail ? `${upload.objectKey}.preview.webp` : upload.objectKey;
    const contentType = isThumbnail
      ? 'image/webp'
      : isInline
        ? file.mediaType
        : 'application/octet-stream';

    return { url: await this.storage.signDownload(key, file.name, contentType, isInline) };
  }
}
