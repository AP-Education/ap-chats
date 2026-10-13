import { ConflictException, NotFoundException } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { Attachment } from '../messages/types/message.types';
import type { ChatUpload } from './types';

// uploading ──complete──▶ ready ──claim──▶ attached
//     │                    │
//     └──────cancel────────┴──▶ cancelled; anything but attached also lapses at expiresAt

export function requireOwnUpload(
  upload: ChatUpload | null,
  member: WorkspaceMember,
  channelId: string,
): ChatUpload {
  const isUsable = upload !== null && ownedBy(upload, member, channelId) && !hasLapsed(upload);
  if (!isUsable) throw new NotFoundException('Upload not found or expired');

  return upload;
}

export function ownedBy(upload: ChatUpload, member: WorkspaceMember, channelId: string): boolean {
  return (
    upload.workspaceId === member.workspaceId &&
    upload.channelId === channelId &&
    upload.ownerMemberId === member.id
  );
}

export function isFinished(upload: ChatUpload): upload is ChatUpload & { metadata: Attachment } {
  const isPastUploading = upload.state === 'ready' || upload.state === 'attached';
  return isPastUploading && upload.metadata !== null;
}

/** Parts can still be signed while nobody is completing the upload. */
export function requireUploading(upload: ChatUpload): void {
  const isOpen = upload.state === 'uploading' && !upload.processingToken;
  if (!isOpen) throw new ConflictException('Upload is already being completed');
}

export function requireReady(upload: ChatUpload): Attachment {
  const metadata = upload.state === 'ready' ? upload.metadata : null;
  if (!metadata) throw new ConflictException('Attachment is not ready');

  return metadata;
}

export function requireCancellable(upload: ChatUpload): void {
  if (upload.state === 'attached') throw new ConflictException('Upload is attached to a message');
}

function hasLapsed(upload: ChatUpload): boolean {
  if (upload.state === 'cancelled') return true;

  return upload.state !== 'attached' && upload.expiresAt.getTime() <= Date.now();
}
