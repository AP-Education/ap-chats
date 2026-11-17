import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { manifestOf, readExport } from './manifest';

async function exportDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'expo-export-'));
  await mkdir(path.join(dir, '_expo/static/js/ios'), { recursive: true });
  await mkdir(path.join(dir, 'assets'));
  await writeFile(path.join(dir, '_expo/static/js/ios/index-abc.hbc'), 'bundle');
  await writeFile(path.join(dir, 'assets/f1'), 'ring');
  await writeFile(path.join(dir, 'assets/f2'), 'blob');
  await writeFile(
    path.join(dir, 'metadata.json'),
    JSON.stringify({
      version: 0,
      bundler: 'metro',
      fileMetadata: {
        ios: {
          bundle: '_expo/static/js/ios/index-abc.hbc',
          assets: [
            { path: 'assets/f1', ext: 'wav' },
            { path: 'assets/f2', ext: 'bin' },
          ],
        },
      },
    }),
  );
  return dir;
}

test('describes the bundle and assets by their content', async () => {
  const bundle = await readExport(await exportDir(), 'ios', 'https://cdn.example.com/');
  const hash = createHash('sha256').update('bundle').digest('base64url');

  assert.deepEqual(manifestOf(bundle).launchAsset, {
    hash,
    key: createHash('md5').update('bundle').digest('hex'),
    contentType: 'application/javascript',
    fileExtension: '.bundle',
    url: `https://cdn.example.com/app-updates/${hash}.bundle`,
  });
  assert.equal(hash.length, 43);
  assert.deepEqual(
    bundle.assets.map((file) => [file.contentType, file.fileExtension]),
    [
      ['audio/wav', '.wav'],
      ['application/octet-stream', '.bin'],
    ],
  );
  assert.equal(bundle.assets[0]?.objectKey.startsWith('app-updates/'), true);
});

test('refuses an export without the platform', async () => {
  await assert.rejects(readExport(await exportDir(), 'android', 'https://cdn.example.com'), {
    message: 'The export has no android bundle',
  });
});
