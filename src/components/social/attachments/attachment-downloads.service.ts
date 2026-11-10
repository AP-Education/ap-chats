import { ObjectStorage } from '@ap-education/storage';
import { Injectable, NotFoundException } from '@nestjs/common';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { MessagesService } from '../messages';
import type { MessageRef } from '../messages/types/message.types';
import { type DownloadVariant, linkOf } from './attachment-links';
import { ChatUploadsRepository } from './repository/chat-uploads.repository';

@Injectable()
export class AttachmentDownloadsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly messages: MessagesService,
    private readonly repository: ChatUploadsRepository,
    private readonly storage: ObjectStorage,
  ) {}

  /** A file saved or played once opened, or an image whose link from the history lapsed. */
  async link(member: WorkspaceMember, message: MessageRef, id: string, variant: DownloadVariant) {
    await this.access.requireViewAccess(member, message.channelId);
    const { attachments } = await this.messages.requireLive(message, member.id);
    const file = attachments.find((attachment) => attachment.id === id);
    if (!file) throw new NotFoundException('Attachment not found');

    const upload = await this.repository.find(id);
    const isStored = upload?.state === 'attached' && upload.workspaceId === member.workspaceId;
    if (!isStored) throw new NotFoundException('Attachment not found');

    const link = linkOf(upload.objectKey, file, variant);
    if (!link) throw new NotFoundException('Attachment is not read that way');

    const url = await this.storage.signLink(link.key, link.options);
    return { url };
  }
}
