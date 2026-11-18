import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { PublishUpdateDto } from './publish-update.dto';

const asset = {
  hash: 'n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg',
  key: '0cc175b9c0f1b6a831c399e269772661',
  contentType: 'application/javascript',
  url: 'https://cdn.test/app-updates/ios/bundle.hbc',
};
const valid = {
  platform: 'ios',
  channel: 'production',
  runtimeVersion: 'fp-1',
  manifest: {
    launchAsset: asset,
    assets: [{ ...asset, contentType: 'image/png', fileExtension: '.png' }],
    expoClient: { name: 'AP App', extra: { eas: { projectId: 'project-1' } } },
  },
};
const errors = (body: object) => validateSync(plainToInstance(PublishUpdateDto, body));

test('accepts an exported bundle with its assets', () => {
  assert.equal(errors(valid).length, 0);
});

test('rejects assets that are not hashed or not served over HTTPS', () => {
  for (const launchAsset of [
    { ...asset, hash: 'not-a-sha256' },
    { ...asset, url: 'http://cdn.test/bundle' },
    { ...asset, key: '../escape' },
    { ...asset, fileExtension: 'png' },
  ])
    assert.notEqual(
      errors({ ...valid, manifest: { ...valid.manifest, launchAsset } }).length,
      0,
      JSON.stringify(launchAsset),
    );
});

test('rejects a release without a bundle or outside the known channels', () => {
  assert.notEqual(errors({ ...valid, manifest: undefined }).length, 0);
  assert.notEqual(errors({ ...valid, channel: 'staging' }).length, 0);
  assert.notEqual(errors({ ...valid, rolloutPercent: 101 }).length, 0);
});

test('requires the app config the bundle was exported with', () => {
  const manifest: Partial<typeof valid.manifest> = { ...valid.manifest };
  delete manifest.expoClient;
  assert.notEqual(errors({ ...valid, manifest }).length, 0);
  assert.notEqual(errors({ ...valid, manifest: { ...manifest, expoClient: 'AP App' } }).length, 0);
});
