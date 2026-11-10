import type { ChatUpload } from '@/components/social/attachments/types';
import type { Attachment } from '@/components/social/messages/types/message.types';

export const videoAttachment: Attachment = {
  id: 'video',
  name: 'meeting.mp4',
  size: 100,
  mediaType: 'video/mp4',
  preview: 'video',
  width: 320,
  height: 180,
  duration: 2,
  hasThumbnail: true,
  placeholder: 'fixture',
  description: null,
};

export function chatUpload(overrides: Partial<ChatUpload> = {}): ChatUpload {
  return {
    id: 'video',
    workspaceId: 'workspace',
    channelId: 'channel',
    ownerMemberId: 'member',
    name: 'meeting.mp4',
    size: 100,
    objectKey: 'private/video',
    multipartId: 'multipart',
    state: 'uploading',
    metadata: null,
    processingToken: null,
    processingUntil: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}
