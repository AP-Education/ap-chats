import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { StorageProvider } from '../storage/storage.provider';
import { AttachmentPreviewService } from './attachment-preview.service';
import { ChatUploadsRepository } from './repository';
import {
  type Attachment,
  type AttachmentRef,
  type ChatUpload,
  READY_LIFETIME_MS,
  UPLOAD_LIFETIME_MS,
} from './types';
import { normalizeFilename, partSize, UploadPolicy, validateParts } from './upload-policy';

@Injectable()
export class ChatUploadsService {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly repository: ChatUploadsRepository,
    private readonly storage: StorageProvider,
    private readonly preview: AttachmentPreviewService,
    readonly policy: UploadPolicy,
  ) {}

  @Transactional()
  async begin(member: WorkspaceMember, channelId: string, name: string, size: number) {
    this.policy.requireFile(size);
    const filename = normalizeFilename(name);
    await this.repository.lockOwner(member.id);
    await this.access.requirePostAccess(member, channelId);
    const reserved = await this.repository.reservations(member.id);
    this.policy.requireReservationCapacity(reserved, size);
    const id = randomUUID();
    const objectKey = `chat-attachments/${member.workspaceId}/${id}`;
    const multipartId = await this.storage.beginMultipart(objectKey);
    try {
      const row = await this.repository.insert({
        id,
        workspaceId: member.workspaceId,
        channelId,
        ownerMemberId: member.id,
        name: filename,
        size,
        objectKey,
        multipartId,
        expiresAt: new Date(Date.now() + UPLOAD_LIFETIME_MS),
      });
      return { id: row.id, partBytes: this.policy.limits.partBytes, expiresAt: row.expiresAt };
    } catch (error) {
      await this.storage.abortMultipart(objectKey, multipartId);
      throw error;
    }
  }

  @Transactional()
  async signPart(member: WorkspaceMember, channelId: string, id: string, number: number) {
    await this.access.requirePostAccess(member, channelId);
    const row = this.requireOwner(await this.repository.find(id), member, channelId);
    if (row.state !== 'uploading' || row.processingToken)
      throw new ConflictException('Upload is already being completed');
    const size = partSize(row.size, number);
    return { url: await this.storage.signPart(row.objectKey, row.multipartId, number, size) };
  }

  async complete(member: WorkspaceMember, channelId: string, id: string): Promise<Attachment> {
    const row = await this.startCompletion(member, channelId, id);
    if ((row.state === 'ready' || row.state === 'attached') && row.metadata) return row.metadata;
    try {
      try {
        const parts = await this.storage.listParts(row.objectKey, row.multipartId);
        validateParts(row.size, parts);
        await this.storage.completeMultipart(row.objectKey, row.multipartId, parts);
      } catch (error) {
        // Storage completion may succeed before a lost response or DB commit.
        if (!(error instanceof Error && error.name === 'NoSuchUpload')) throw error;
      }
      if ((await this.storage.objectSize(row.objectKey)) !== row.size)
        throw new BadRequestException('Stored file size does not match');
      const metadata: Attachment = {
        id: row.id,
        name: row.name,
        size: row.size,
        description: null,
        ...(await this.preview.inspect(row.objectKey, row.size)),
      };
      await this.finishCompletion(member, channelId, row, metadata);
      return metadata;
    } catch (error) {
      await this.releaseCompletion(row);
      throw error;
    }
  }

  @Transactional()
  private async startCompletion(member: WorkspaceMember, channelId: string, id: string) {
    await this.access.requirePostAccess(member, channelId);
    const row = this.requireOwner(await this.repository.lock(id), member, channelId);
    if (row.state === 'ready' || row.state === 'attached') return row;
    if (row.processingUntil && row.processingUntil.getTime() > Date.now())
      throw new ConflictException('Upload is being completed');
    const processingUntil = new Date(Date.now() + 30 * 60 * 1000);
    const lease = { processingToken: randomUUID(), processingUntil };
    await this.repository.update(id, {
      ...lease,
      expiresAt: new Date(Math.max(row.expiresAt.getTime(), processingUntil.getTime())),
    });
    return { ...row, ...lease };
  }

  @Transactional()
  private async finishCompletion(
    member: WorkspaceMember,
    channelId: string,
    lease: ChatUpload,
    metadata: Attachment,
  ): Promise<void> {
    await this.access.requirePostAccess(member, channelId);
    const row = this.requireOwner(await this.repository.lock(lease.id), member, channelId);
    if (row.state !== 'uploading' || row.processingToken !== lease.processingToken)
      throw new ConflictException('Upload completion was cancelled');
    await this.repository.update(row.id, {
      state: 'ready',
      metadata,
      processingToken: null,
      processingUntil: null,
      expiresAt: new Date(Date.now() + READY_LIFETIME_MS),
    });
  }

  @Transactional()
  private async releaseCompletion(lease: ChatUpload): Promise<void> {
    const row = await this.repository.lock(lease.id);
    if (row?.processingToken === lease.processingToken)
      await this.repository.update(lease.id, { processingToken: null, processingUntil: null });
  }

  @Transactional()
  async cancel(member: WorkspaceMember, channelId: string, id: string): Promise<void> {
    const row = await this.repository.lock(id);
    if (
      !row ||
      row.workspaceId !== member.workspaceId ||
      row.channelId !== channelId ||
      row.ownerMemberId !== member.id
    )
      throw new NotFoundException('Upload not found');
    if (row.state === 'attached') throw new ConflictException('Upload is attached to a message');
    await this.repository.update(id, { state: 'cancelled', expiresAt: new Date() });
    await this.storage.abortMultipart(row.objectKey, row.multipartId);
  }

  async claim(
    member: WorkspaceMember,
    channelId: string,
    refs: AttachmentRef[],
  ): Promise<Attachment[]> {
    const ids = refs.map((ref) => ref.id);
    this.policy.requireSelection(ids);
    const rows = await this.repository.lockMany(ids);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const attachments = refs.map(({ id, description }) => {
      const row = this.requireOwner(byId.get(id) ?? null, member, channelId);
      if (row.state !== 'ready' || !row.metadata)
        throw new ConflictException('Attachment is not ready');
      return {
        ...row.metadata,
        description: row.metadata.preview === 'image' ? description?.trim() || null : null,
      };
    });
    if (
      attachments.reduce((total, file) => total + file.size, 0) > this.policy.limits.maxMessageBytes
    )
      throw new BadRequestException('Attachments exceed the message size limit');
    await this.repository.attach(ids);
    return attachments;
  }

  @Transactional()
  async download(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    id: string,
    variant: string,
  ) {
    await this.access.requireReadAccess(member, channelId);
    const message = await this.repository.message(member.workspaceId, channelId, messageId);
    const file = message?.attachments.find((attachment) => attachment.id === id);
    if (!file) throw new NotFoundException('Attachment not found');
    const row = await this.repository.find(id);
    if (!row || row.state !== 'attached' || row.workspaceId !== member.workspaceId)
      throw new NotFoundException('Attachment not found');
    const thumbnail = variant === 'thumbnail' && file.preview === 'image';
    const inline = thumbnail || (variant === 'preview' && file.preview !== null);
    return {
      url: await this.storage.signDownload(
        thumbnail ? `${row.objectKey}.preview.webp` : row.objectKey,
        file.name,
        thumbnail ? 'image/webp' : inline ? file.mediaType : 'application/octet-stream',
        inline,
      ),
    };
  }

  private requireOwner(
    row: ChatUpload | null,
    member: WorkspaceMember,
    channelId: string,
  ): ChatUpload {
    if (
      !row ||
      row.workspaceId !== member.workspaceId ||
      row.channelId !== channelId ||
      row.ownerMemberId !== member.id ||
      row.state === 'cancelled' ||
      (row.state !== 'attached' && row.expiresAt.getTime() <= Date.now())
    )
      throw new NotFoundException('Upload not found or expired');
    return row;
  }
}
