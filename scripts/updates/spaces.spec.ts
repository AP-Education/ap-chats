import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import type { UpdateFile } from './manifest';
import { type ObjectStore, uploadMissing } from './spaces';

function memoryStore(existing: string[]) {
  const objects = new Map(existing.map((key) => [key, '']));
  const store: ObjectStore = {
    exists: async (key) => objects.has(key),
    put: async (key, body, contentType) => {
      objects.set(key, `${contentType}:${body.toString()}`);
    },
  };
  return { store, objects };
}

async function file(name: string, objectKey: string): Promise<UpdateFile> {
  const localPath = path.join(await mkdtemp(path.join(tmpdir(), 'update-file-')), name);
  await writeFile(localPath, name);
  return {
    hash: 'h',
    key: 'k',
    contentType: 'audio/wav',
    fileExtension: '.wav',
    url: '',
    objectKey,
    localPath,
  };
}

test('sends only the files the bucket lacks, each once', async () => {
  const { store, objects } = memoryStore(['app-updates/old.wav']);
  const files = [
    await file('old', 'app-updates/old.wav'),
    await file('new', 'app-updates/new.wav'),
    await file('new', 'app-updates/new.wav'),
  ];

  assert.deepEqual(await uploadMissing(store, files), { sent: 1, kept: 1 });
  assert.equal(objects.get('app-updates/new.wav'), 'audio/wav:new');
  assert.equal(objects.get('app-updates/old.wav'), '');
});
