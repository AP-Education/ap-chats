import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import type { StorageProvider } from '@/components/uploads/storage';
import type { Logger } from '@/globals/logger';
import { chatUpload, videoAttachment } from '@/testing/chat-upload';
import { memoryTransactionHost } from '@/testing/transactions';

import type { ChatUploadsRepository } from './repository/chat-uploads.repository';
import type { ChatUpload, ChatUploadPatch } from './types';
import { UploadCleanupService } from './upload-cleanup.service';

memoryTransactionHost();

function setup(initial: ChatUpload[] = [chatUpload({ expiresAt: new Date(0) })]) {
  const rows = new Map(initial.map((row) => [row.id, row]));
  const references = new Set<string>();
  const repository = {
    expired: mock.fn(async () => [...rows.values()]),
    lock: async (id: string) => rows.get(id) ?? null,
    update: async (id: string, patch: ChatUploadPatch) =>
      rows.set(id, { ...rows.get(id)!, ...patch }),
    remove: async (id: string) => {
      rows.delete(id);
    },
    hasLiveReferences: async (id: string) => references.has(id),
  };
  const removed: string[] = [];
  const storage = {
    abortMultipart: mock.fn(async () => undefined),
    deleteObject: mock.fn(async (key: string) => {
      removed.push(key);
    }),
  };
  const logger = { error: mock.fn() };
  const service = new UploadCleanupService(
    repository as unknown as ChatUploadsRepository,
    storage as unknown as StorageProvider,
    logger as unknown as Logger,
  );
  return { service, rows, references, removed, storage, logger, repository };
}

test('expired video reservations remove the original, its private poster and the database record', async () => {
  for (const state of ['uploading', 'ready', 'cancelled', 'attached'] as const) {
    const f = setup([chatUpload({ state, metadata: videoAttachment, expiresAt: new Date(0) })]);
    await f.service.sweep();
    assert.deepEqual(f.removed, ['private/video', 'private/video.preview.webp']);
    assert.equal(f.rows.size, 0);
  }
});

test('a live forwarded message protects both the original and poster and renews the cleanup grace', async () => {
  const f = setup([
    chatUpload({ state: 'attached', metadata: videoAttachment, expiresAt: new Date(0) }),
  ]);
  f.references.add('video');
  const before = Date.now();
  await f.service.sweep();
  assert.deepEqual(f.removed, []);
  assert.equal(f.storage.abortMultipart.mock.callCount(), 0);
  assert.ok(f.rows.get('video')!.expiresAt.getTime() >= before + 24 * 60 * 60 * 1000);
});

test('a reservation renewed or removed after scanning is rechecked before touching storage', async () => {
  const renewed = chatUpload();
  const f = setup([renewed]);
  f.repository.expired.mock.mockImplementation(async () => [renewed, chatUpload({ id: 'gone' })]);
  await f.service.sweep();
  assert.deepEqual(f.removed, []);
  assert.equal(f.rows.size, 1);
});

test('poster deletion failure preserves the record for retry and does not stop other expired files', async () => {
  const f = setup([
    chatUpload({ expiresAt: new Date(0) }),
    chatUpload({ id: 'other', objectKey: 'private/other', expiresAt: new Date(0) }),
  ]);
  let unavailable = true;
  f.storage.deleteObject.mock.mockImplementation(async (key: string) => {
    if (key === 'private/video.preview.webp' && unavailable) throw new Error('storage offline');
    f.removed.push(key);
  });
  await f.service.sweep();
  assert.equal(f.rows.has('video'), true);
  assert.equal(f.rows.has('other'), false);
  assert.equal(f.logger.error.mock.callCount(), 1);
  unavailable = false;
  await f.service.sweep();
  assert.equal(f.rows.size, 0);
  assert.ok(f.removed.includes('private/video.preview.webp'));
});

test('overlapping sweeps do not delete the same batch twice', async () => {
  const f = setup();
  let entered!: () => void;
  let release!: () => void;
  const scanning = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.repository.expired.mock.mockImplementation(async () => {
    entered();
    await held;
    return [...f.rows.values()];
  });
  const first = f.service.sweep();
  try {
    await scanning;
    await f.service.sweep();
  } finally {
    release();
  }
  await first;
  assert.equal(f.repository.expired.mock.callCount(), 1);
  assert.deepEqual(f.removed, ['private/video', 'private/video.preview.webp']);
});

test('a failed scan is logged and a later sweep still works', async () => {
  const f = setup();
  f.repository.expired.mock.mockImplementationOnce(async () => {
    throw new Error('database unavailable');
  });
  await f.service.sweep();
  assert.equal(f.logger.error.mock.callCount(), 1);
  assert.equal(f.rows.size, 1);
  await f.service.sweep();
  assert.equal(f.rows.size, 0);
});

test('background cleanup repeats after its interval and stops when the module is destroyed', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = setup([]);
  f.service.onModuleInit();
  t.mock.timers.tick(70_000);
  await setImmediate();
  assert.equal(f.repository.expired.mock.callCount(), 1);
  t.mock.timers.tick(70_000);
  await setImmediate();
  assert.equal(f.repository.expired.mock.callCount(), 2);
  f.service.onModuleDestroy();
  t.mock.timers.tick(140_000);
  await setImmediate();
  assert.equal(f.repository.expired.mock.callCount(), 2);
});
