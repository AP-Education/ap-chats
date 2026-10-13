import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { StorageProvider } from '@/components/uploads/storage';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { Attachment } from '../messages/types/message.types';
import { ChatUploadsRepository } from './repository/chat-uploads.repository';
import { type AttachmentRef, UPLOAD_LIFETIME_MS } from './types';
import {
  ownedBy,
  requireCancellable,
  requireOwnUpload,
  requireReady,
  requireUploading,
} from './upload-lifecycle';
import { normalizeFilename, partSize, UploadPolicy } from './upload-policy';

interface Reservation {
  id: string;
  name: string;
  size: number;
  objectKey: string;
  multipartId: string;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly repository: ChatUploadsRepository,
    private readonly storage: StorageProvider,
    private readonly policy: UploadPolicy,
  ) {}

  get limits() {
    return this.policy.limits;
  }

  // Storage opens first and aborts on refusal, so no transaction ever waits on it.
  async begin(member: WorkspaceMember, channelId: string, name: string, size: number) {
    this.policy.requireFile(size);
    const id = randomUUID();
    const objectKey = `chat-attachments/${member.workspaceId}/${id}`;
    const reservation = { id, name: normalizeFilename(name), size, objectKey };

    const multipartId = await this.storage.beginMultipart(objectKey);
    try {
      return await this.reserve(member, channelId, { ...reservation, multipartId });
    } catch (error) {
      await this.storage.abortMultipart(objectKey, multipartId);
      throw error;
    }
  }

  async signPart(member: WorkspaceMember, channelId: string, id: string, number: number) {
    await this.access.requirePostRight(member, channelId);
    const upload = requireOwnUpload(await this.repository.find(id), member, channelId);
    requireUploading(upload);

    const size = partSize(upload.size, number);
    return { url: await this.storage.signPart(upload.objectKey, upload.multipartId, number, size) };
  }

  async cancel(member: WorkspaceMember, channelId: string, id: string): Promise<void> {
    const upload = await this.markCancelled(member, channelId, id);

    await this.storage.abortMultipart(upload.objectKey, upload.multipartId);
  }

  /** Inside the transaction that posts the message. */
  async claim(
    member: WorkspaceMember,
    channelId: string,
    refs: AttachmentRef[],
  ): Promise<Attachment[]> {
    const ids = refs.map((ref) => ref.id);
    this.policy.requireSelection(ids);

    const uploads = new Map((await this.repository.lockMany(ids)).map((row) => [row.id, row]));
    const attachments = refs.map(({ id, description }) => {
      const upload = requireOwnUpload(uploads.get(id) ?? null, member, channelId);
      const metadata = requireReady(upload);
      const isDescribed = metadata.preview === 'image';
      return { ...metadata, description: isDescribed ? description?.trim() || null : null };
    });

    const totalBytes = attachments.reduce((total, file) => total + file.size, 0);
    if (totalBytes > this.policy.limits.maxMessageBytes)
      throw new BadRequestException('Attachments exceed the message size limit');

    await this.repository.attach(ids);
    return attachments;
  }

  @Transactional()
  private async reserve(member: WorkspaceMember, channelId: string, reservation: Reservation) {
    await this.repository.lockOwner(member.id);
    await this.access.requirePostRight(member, channelId);
    this.policy.requireReservationCapacity(
      await this.repository.reservations(member.id),
      reservation.size,
    );

    const upload = await this.repository.insert({
      ...reservation,
      workspaceId: member.workspaceId,
      channelId,
      ownerMemberId: member.id,
      expiresAt: new Date(Date.now() + UPLOAD_LIFETIME_MS),
    });
    return { id: upload.id, partBytes: this.policy.limits.partBytes, expiresAt: upload.expiresAt };
  }

  @Transactional()
  private async markCancelled(member: WorkspaceMember, channelId: string, id: string) {
    const upload = await this.repository.lock(id);
    const isOwn = upload !== null && ownedBy(upload, member, channelId);
    if (!isOwn) throw new NotFoundException('Upload not found');
    requireCancellable(upload);

    await this.repository.update(id, { state: 'cancelled', expiresAt: new Date() });
    return upload;
  }
}
