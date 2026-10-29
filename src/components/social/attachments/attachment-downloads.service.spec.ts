import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { StorageProvider } from '@/components/uploads/storage';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { MessagesService } from '../messages';
import type { Attachment } from '../messages/types/message.types';
import { AttachmentDownloadsService } from './attachment-downloads.service';
import type { ChatUploadsRepository } from './repository/chat-uploads.repository';

const member = { workspaceId: 'workspace' } as WorkspaceMember;
const message = { workspaceId: 'workspace', channelId: 'channel', messageId: 'message' };

function setup(file: Partial<Attachment>, state = 'attached', workspaceId = 'workspace') {
  const calls: unknown[][] = [];
  const access = {
    requireViewAccess: async () => {
      calls.push(['access']);
    },
  };
  const messages = {
    requireLive: async () => {
      calls.push(['message']);
      return { attachments: [{ id: 'file', name: 'video.mp4', mediaType: 'video/mp4', ...file }] };
    },
  };
  const repository = { find: async () => ({ state, workspaceId, objectKey: 'private/video' }) };
  const storage = {
    signDownload: async (...args: unknown[]) => {
      calls.push(args);
      return 'signed-url';
    },
  };
  const service = new AttachmentDownloadsService(
    access as unknown as ChannelAccessPolicy,
    messages as unknown as MessagesService,
    repository as unknown as ChatUploadsRepository,
    storage as unknown as StorageProvider,
  );
  return { service, calls, access };
}

test('a video poster is signed as a private inline WebP after read access and live-message checks', async () => {
  const { service, calls } = setup({ preview: 'video', hasThumbnail: true });
  assert.deepEqual(await service.link(member, message, 'file', 'thumbnail'), { url: 'signed-url' });
  assert.deepEqual(calls, [
    ['access'],
    ['message'],
    ['private/video.preview.webp', 'video.mp4', 'image/webp', true],
  ]);
});

test('old videos cannot return their original bytes for a thumbnail request', async () => {
  const { service, calls } = setup({ preview: 'video' });
  await assert.rejects(service.link(member, message, 'file', 'thumbnail'), /thumbnail not found/);
  assert.equal(calls.length, 2);
  await service.link(member, message, 'file', 'preview');
  assert.deepEqual(calls.at(-1), ['private/video', 'video.mp4', 'video/mp4', true]);
});

test('photos keep their existing thumbnail contract without new metadata', async () => {
  const { service, calls } = setup({ preview: 'image' });
  await service.link(member, message, 'file', 'thumbnail');
  assert.deepEqual(calls.at(-1), ['private/video.preview.webp', 'video.mp4', 'image/webp', true]);
});

test('revoked access stops before reading or signing the attachment', async () => {
  const { service, access, calls } = setup({ preview: 'video', hasThumbnail: true });
  access.requireViewAccess = async () => {
    throw new Error('forbidden');
  };
  await assert.rejects(service.link(member, message, 'file', 'thumbnail'), /forbidden/);
  assert.deepEqual(calls, []);
});

test('a missing live reference, unattached upload or other workspace cannot obtain a URL', async () => {
  for (const [id, state, workspaceId] of [
    ['missing', 'attached', 'workspace'],
    ['file', 'ready', 'workspace'],
    ['file', 'attached', 'other'],
  ]) {
    const { service, calls } = setup({ preview: 'video', hasThumbnail: true }, state, workspaceId);
    await assert.rejects(service.link(member, message, id!, 'thumbnail'), /Attachment not found/);
    assert.equal(calls.length, 2);
  }
});
