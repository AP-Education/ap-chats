import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { NoSuchUploadError, StorageProvider } from '@/components/uploads/storage';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { Attachment } from '../messages/types/message.types';
import { AttachmentPreviewService } from './attachment-preview.service';
import { ChatUploadsRepository } from './repository/chat-uploads.repository';
import { type ChatUpload, READY_LIFETIME_MS } from './types';
import { isFinished, requireOwnUpload } from './upload-lifecycle';
import { validateParts } from './upload-policy';
import { inspectVoice, MAX_VOICE_BYTES } from './voice-inspection';

const COMPLETION_LEASE_MS = 30 * 60 * 1000;

/** Storage work runs between two short transactions, under a lease against a racing completion. */
@Injectable()
export class UploadCompletionService {
  private inspectingVoice = 0;
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly repository: ChatUploadsRepository,
    private readonly storage: StorageProvider,
    private readonly preview: AttachmentPreviewService,
  ) {}

  async complete(
    member: WorkspaceMember,
    channelId: string,
    id: string,
    kind?: 'voice',
  ): Promise<Attachment> {
    const upload = await this.lease(member, channelId, id);
    if (isFinished(upload)) {
      if (kind === 'voice' && !upload.metadata.voice)
        throw new BadRequestException('Upload was completed as a regular file');
      return upload.metadata;
    }

    try {
      const metadata = await this.assemble(upload, kind);
      await this.finish(member, channelId, upload, metadata);
      return metadata;
    } catch (error) {
      await this.releaseLease(upload);
      throw error;
    }
  }

  private async assemble(upload: ChatUpload, kind?: 'voice'): Promise<Attachment> {
    if (kind === 'voice' && upload.size > MAX_VOICE_BYTES)
      throw new BadRequestException('Voice recording is too large');
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

    const media =
      kind === 'voice'
        ? await this.inspectRecording(upload)
        : await this.preview.inspect(upload.objectKey, upload.size);
    return {
      id: upload.id,
      name: upload.name,
      size: upload.size,
      description: null,
      ...media,
    };
  }

  private async inspectRecording(upload: ChatUpload) {
    if (this.inspectingVoice >= 2)
      throw new ServiceUnavailableException('Voice processing is busy; retry completion');
    this.inspectingVoice++;
    try {
      return await this.readRecording(upload);
    } finally {
      this.inspectingVoice--;
    }
  }

  private async readRecording(upload: ChatUpload) {
    const input = await this.storage.readObject(upload.objectKey);
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => input.destroy(new Error('Voice inspection timed out')), 30_000);
    try {
      for await (const value of input) {
        const chunk = Buffer.from(value as Uint8Array);
        size += chunk.length;
        if (size > upload.size || size > MAX_VOICE_BYTES)
          throw new BadRequestException('Voice recording exceeds its declared size');
        chunks.push(chunk);
      }
      if (size !== upload.size) throw new BadRequestException('Voice recording is incomplete');
      return await inspectVoice(Buffer.concat(chunks));
    } finally {
      clearTimeout(timer);
      input.destroy();
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
