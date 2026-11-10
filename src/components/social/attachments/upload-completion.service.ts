import { randomUUID } from 'node:crypto';

import { NoSuchUploadError, ObjectStorage } from '@ap-education/storage';
import { MediaBusyError, MediaInspector } from '@ap-education/storage/media';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { Attachment } from '../messages/types/message.types';
import { attachmentMedia } from './attachment-media';
import { ChatUploadsRepository } from './repository/chat-uploads.repository';
import { type ChatUpload, READY_LIFETIME_MS } from './types';
import { isFinished, requireOwnUpload } from './upload-lifecycle';
import { validateParts } from './upload-policy';

const COMPLETION_LEASE_MS = 30 * 60 * 1000;

/** Storage work runs between two short transactions, under a lease against a racing completion. */
@Injectable()
export class UploadCompletionService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly repository: ChatUploadsRepository,
    private readonly storage: ObjectStorage,
    private readonly media: MediaInspector,
  ) {}

  async complete(member: WorkspaceMember, channelId: string, id: string): Promise<Attachment> {
    const upload = await this.lease(member, channelId, id);
    if (isFinished(upload)) return upload.metadata;

    try {
      const metadata = await this.assemble(upload);
      await this.finish(member, channelId, upload, metadata);
      return metadata;
    } catch (error) {
      await this.releaseLease(upload);
      throw error;
    }
  }

  private async assemble(upload: ChatUpload): Promise<Attachment> {
    try {
      const parts = await this.storage.listParts(upload.objectKey, upload.multipartId);
      validateParts(upload.size, parts);
      await this.storage.completeMultipart(upload.objectKey, upload.multipartId, parts);
    } catch (error) {
      // Storage completion may succeed before a lost response or DB commit.
      if (!(error instanceof NoSuchUploadError)) throw error;
    }

    const storedSize = await this.storage.objectSize(upload.objectKey);
    if (storedSize !== upload.size)
      throw new BadRequestException('Stored file size does not match');

    const media = await this.inspect(upload);
    return {
      id: upload.id,
      name: upload.name,
      size: upload.size,
      description: null,
      ...attachmentMedia(media),
    };
  }

  private async inspect(upload: ChatUpload) {
    try {
      return await this.media.inspect(upload.objectKey, upload.size);
    } catch (error) {
      if (error instanceof MediaBusyError)
        throw new ServiceUnavailableException('Preview processing is busy; retry completion');
      throw error;
    }
  }

  @Transactional()
  private async lease(member: WorkspaceMember, channelId: string, id: string) {
    await this.access.requirePostRight(member, channelId);
    const upload = requireOwnUpload(await this.repository.lock(id), member, channelId);
    if (isFinished(upload)) return upload;

    const isLeased = upload.processingUntil && upload.processingUntil.getTime() > Date.now();
    if (isLeased) throw new ConflictException('Upload is being completed');

    const processingUntil = new Date(Date.now() + COMPLETION_LEASE_MS);
    const lease = { processingToken: randomUUID(), processingUntil };
    const expiresAt = new Date(Math.max(upload.expiresAt.getTime(), processingUntil.getTime()));
    await this.repository.update(id, { ...lease, expiresAt });

    return { ...upload, ...lease };
  }

  @Transactional()
  private async finish(
    member: WorkspaceMember,
    channelId: string,
    lease: ChatUpload,
    metadata: Attachment,
  ): Promise<void> {
    await this.access.requirePostRight(member, channelId);
    const upload = requireOwnUpload(await this.repository.lock(lease.id), member, channelId);
    const holdsLease =
      upload.state === 'uploading' && upload.processingToken === lease.processingToken;
    if (!holdsLease) throw new ConflictException('Upload completion was cancelled');

    await this.repository.update(upload.id, {
      state: 'ready',
      metadata,
      processingToken: null,
      processingUntil: null,
      expiresAt: new Date(Date.now() + READY_LIFETIME_MS),
    });
  }

  @Transactional()
  private async releaseLease(lease: ChatUpload): Promise<void> {
    const upload = await this.repository.lock(lease.id);
    if (upload?.processingToken === lease.processingToken)
      await this.repository.update(lease.id, { processingToken: null, processingUntil: null });
  }
}
