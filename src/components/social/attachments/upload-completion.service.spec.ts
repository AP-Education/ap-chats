import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { NoSuchUploadError, type StorageProvider } from '@/components/uploads/storage';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { chatUpload, videoAttachment } from '@/testing/chat-upload';
import { memoryTransactionHost } from '@/testing/transactions';

import type { AttachmentPreviewService } from './attachment-preview.service';
import type { ChatUploadsRepository } from './repository/chat-uploads.repository';
import { type ChatUpload, type ChatUploadPatch, READY_LIFETIME_MS } from './types';
import { UploadCompletionService } from './upload-completion.service';

memoryTransactionHost();
const member = { id: 'member', workspaceId: 'workspace' } as WorkspaceMember;

function setup(initial: ChatUpload | null = chatUpload()) {
  let row = initial;
  const access = { requirePostRight: mock.fn(async () => undefined) };
  const repository = {
    lock: async () => row && structuredClone(row),
    update: async (_id: string, patch: ChatUploadPatch) => {
      if (row) row = { ...row, ...patch };
    },
  };
  const storage = {
    listParts: mock.fn(async () => [{ number: 1, size: 100, etag: 'part' }]),
    completeMultipart: mock.fn(async () => undefined),
    objectSize: mock.fn(async () => 100),
  };
  const media = {
    mediaType: videoAttachment.mediaType,
    preview: videoAttachment.preview,
    width: videoAttachment.width,
    height: videoAttachment.height,
    duration: videoAttachment.duration,
    hasThumbnail: videoAttachment.hasThumbnail,
    placeholder: videoAttachment.placeholder,
  };
  const preview = { inspect: mock.fn(async () => media) };
  const service = new UploadCompletionService(
    access as unknown as ChannelAccessPolicy,
    repository as unknown as ChatUploadsRepository,
    storage as unknown as StorageProvider,
    preview as unknown as AttachmentPreviewService,
  );
  return {
    service,
    access,
    storage,
    preview,
    media,
    read: () => row,
    replace: (next: ChatUpload | null) => {
      row = next;
    },
    complete: () => service.complete(member, 'channel', 'video'),
  };
}

test('completion publishes inspected video metadata and a ready lifetime, and releases its lease', async () => {
  const f = setup();
  const started = Date.now();
  assert.deepEqual(await f.complete(), videoAttachment);
  assert.equal(f.read()?.state, 'ready');
  assert.deepEqual(f.read()?.metadata, videoAttachment);
  assert.equal(f.read()?.processingToken, null);
  assert.equal(f.read()?.processingUntil, null);
  assert.ok(f.read()!.expiresAt.getTime() >= started + READY_LIFETIME_MS);
});

test('ready and attached videos can be completed again without assembling or rendering twice', async () => {
  for (const state of ['ready', 'attached'] as const) {
    const f = setup(chatUpload({ state, metadata: videoAttachment }));
    assert.deepEqual(await f.complete(), videoAttachment);
    assert.equal(f.storage.listParts.mock.callCount(), 0);
    assert.equal(f.preview.inspect.mock.callCount(), 0);
  }
});

test('another owner, channel or workspace, cancelled uploads and expired reservations cannot complete', async () => {
  for (const patch of [
    { ownerMemberId: 'other' },
    { workspaceId: 'other' },
    { channelId: 'other' },
    { state: 'cancelled' as const },
    { expiresAt: new Date(0) },
  ]) {
    const f = setup(chatUpload(patch));
    await assert.rejects(f.complete(), NotFoundException);
    assert.equal(f.storage.listParts.mock.callCount(), 0);
  }
  await assert.rejects(setup(null).complete(), NotFoundException);
});

test('revoked post rights stop completion before storage work', async () => {
  const f = setup();
  f.access.requirePostRight.mock.mockImplementation(async () => {
    throw new ForbiddenException();
  });
  await assert.rejects(f.complete(), ForbiddenException);
  assert.equal(f.storage.listParts.mock.callCount(), 0);
  assert.equal(f.read()?.processingToken, null);
});

test('a second completion is rejected while the first renders, then returns the same result', async () => {
  const f = setup();
  let entered!: () => void;
  let release!: () => void;
  const rendering = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const media = f.media;
  f.preview.inspect.mock.mockImplementation(async () => {
    entered();
    await held;
    return media;
  });
  const first = f.complete();
  try {
    await rendering;
    await assert.rejects(f.complete(), ConflictException);
  } finally {
    release();
  }
  assert.deepEqual(await first, videoAttachment);
  assert.deepEqual(await f.complete(), videoAttachment);
  assert.equal(f.storage.completeMultipart.mock.callCount(), 1);
});

test('an expired processing lease can be recovered', async () => {
  const f = setup(chatUpload({ processingToken: 'old', processingUntil: new Date(0) }));
  assert.deepEqual(await f.complete(), videoAttachment);
  assert.equal(f.read()?.processingToken, null);
});

test('a lost multipart completion response recovers from the already assembled private object', async () => {
  const f = setup();
  f.storage.listParts.mock.mockImplementation(async () => {
    throw new NoSuchUploadError();
  });
  assert.deepEqual(await f.complete(), videoAttachment);
  assert.equal(f.storage.completeMultipart.mock.callCount(), 0);
});

test('mismatched stored size cannot become a ready attachment and does not keep a lease', async () => {
  const f = setup();
  f.storage.objectSize.mock.mockImplementation(async () => 99);
  await assert.rejects(f.complete(), BadRequestException);
  assert.equal(f.read()?.state, 'uploading');
  assert.equal(f.read()?.processingToken, null);
  assert.equal(f.preview.inspect.mock.callCount(), 0);
});

test('missing parts remain retryable after the remaining bytes arrive', async () => {
  const f = setup();
  f.storage.listParts.mock.mockImplementationOnce(async () => []);
  await assert.rejects(f.complete(), BadRequestException);
  assert.equal(f.storage.completeMultipart.mock.callCount(), 0);
  assert.equal(f.read()?.processingToken, null);
  assert.deepEqual(await f.complete(), videoAttachment);
});

test('a failed poster publication releases completion so a retry can finish', async () => {
  const f = setup();
  f.preview.inspect.mock.mockImplementationOnce(async () => {
    throw new Error('storage offline');
  });
  await assert.rejects(f.complete(), /storage offline/);
  assert.equal(f.read()?.metadata, null);
  assert.equal(f.read()?.processingToken, null);
  f.storage.listParts.mock.mockImplementation(async () => {
    throw new NoSuchUploadError();
  });
  assert.deepEqual(await f.complete(), videoAttachment);
});

test('cancellation or deletion during rendering cannot resurrect an upload', async () => {
  for (const cancelled of [true, false]) {
    const f = setup();
    const media = f.media;
    f.preview.inspect.mock.mockImplementation(async () => {
      f.replace(cancelled ? { ...f.read()!, state: 'cancelled', expiresAt: new Date(0) } : null);
      return media;
    });
    await assert.rejects(f.complete(), NotFoundException);
    assert.equal(f.read()?.state ?? null, cancelled ? 'cancelled' : null);
  }
});

test('post permission is rechecked after rendering, before the file is published ready', async () => {
  const f = setup();
  f.access.requirePostRight.mock.mockImplementationOnce(async () => undefined);
  f.access.requirePostRight.mock.mockImplementation(async () => {
    throw new ForbiddenException();
  });
  await assert.rejects(f.complete(), ForbiddenException);
  assert.equal(f.preview.inspect.mock.callCount(), 1);
  assert.equal(f.read()?.metadata, null);
  assert.equal(f.read()?.processingToken, null);
});

test('a stale completion never clears a newer worker lease', async () => {
  const f = setup();
  const media = f.media;
  f.preview.inspect.mock.mockImplementation(async () => {
    f.replace({
      ...f.read()!,
      processingToken: 'new-worker',
      processingUntil: new Date(Date.now() + 60_000),
    });
    return media;
  });
  await assert.rejects(f.complete(), ConflictException);
  assert.equal(f.read()?.processingToken, 'new-worker');
  assert.equal(f.read()?.metadata, null);
});
