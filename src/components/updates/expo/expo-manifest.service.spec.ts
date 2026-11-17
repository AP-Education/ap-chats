import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';

import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import type { AppConfigService } from '@/globals/config';
import type { Logger } from '@/globals/logger';

import type { UpdatesRepository } from '../repository';
import type { OfferedAppUpdate, UpdateTarget } from '../types';
import { type ExpoManifestRequest, ExpoManifestService } from './expo-manifest.service';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const createdAt = new Date('2026-11-17T10:00:00.000Z');
const bundle: OfferedAppUpdate = {
  id: '6f1c2c1e-3b8e-4c1a-9b7a-2d1e0f9a8b7c',
  kind: 'update',
  runtimeVersion: 'fp-1',
  manifest: {
    launchAsset: {
      hash: 'aGFzaA',
      key: 'bundle',
      contentType: 'application/javascript',
      url: 'https://cdn.test/bundle',
    },
    assets: [],
  },
  rolloutPercent: 100,
  mandatory: false,
  createdAt,
};

function service(offered: OfferedAppUpdate[], key?: string) {
  const asked: UpdateTarget[] = [];
  const repository = {
    findOffered: (target: UpdateTarget) => {
      asked.push(target);
      return Promise.resolve(offered);
    },
  } as unknown as UpdatesRepository;
  const config = {
    get: (name: string) => (name === 'EXPO_UPDATES_PRIVATE_KEY' ? key : undefined),
  } as AppConfigService;
  const logger = { error: () => undefined } as unknown as Logger;
  return { manifests: new ExpoManifestService(repository, config, logger), asked };
}

const request = (overrides: Partial<ExpoManifestRequest> = {}): ExpoManifestRequest => ({
  protocolVersion: '1',
  platform: 'ios',
  runtimeVersion: 'fp-1',
  channel: 'production',
  installationId: 'phone-1',
  expectsSignature: false,
  ...overrides,
});

/** The first part of the multipart body: its name, signature header and parsed JSON. */
function firstPart(body: string) {
  const [head = '', rest = ''] = body.split('\r\n\r\n');
  const content = rest.slice(0, rest.indexOf('\r\n--'));
  return {
    name: /name="([^"]+)"/u.exec(head)?.[1],
    signature: /expo-signature: sig="([^"]+)"/u.exec(head)?.[1],
    content,
    json: JSON.parse(content) as Record<string, unknown>,
  };
}

test('serves the selected update as a manifest', async () => {
  const { manifests, asked } = service([bundle]);
  const { contentType, body } = await manifests.respond(request());

  assert.match(contentType, /^multipart\/mixed; boundary=/u);
  assert.deepEqual(asked, [{ platform: 'ios', channel: 'production', runtimeVersion: 'fp-1' }]);
  const part = firstPart(body);
  assert.equal(part.name, 'manifest');
  assert.deepEqual(part.json, {
    id: bundle.id,
    createdAt: '2026-11-17T10:00:00.000Z',
    runtimeVersion: 'fp-1',
    launchAsset: bundle.manifest!.launchAsset,
    assets: [],
    metadata: {},
    extra: { mandatory: false },
  });
  assert.match(body, /name="extensions"/u);
});

test('tells the shell there is nothing new when no update is offered', async () => {
  const { body } = await service([]).manifests.respond(request());
  const part = firstPart(body);
  assert.equal(part.name, 'directive');
  assert.deepEqual(part.json, { type: 'noUpdateAvailable' });
});

test('sends a rollback to the embedded bundle as a directive', async () => {
  const rollback: OfferedAppUpdate = { ...bundle, kind: 'rollback_to_embedded', manifest: null };
  const part = firstPart((await service([rollback]).manifests.respond(request())).body);
  assert.equal(part.name, 'directive');
  assert.deepEqual(part.json, {
    type: 'rollBackToEmbedded',
    parameters: { commitTime: '2026-11-17T10:00:00.000Z' },
  });
});

test('offers nothing on an unknown channel without asking the database', async () => {
  const { manifests, asked } = service([bundle]);
  const part = firstPart((await manifests.respond(request({ channel: 'staging' }))).body);
  assert.deepEqual(part.json, { type: 'noUpdateAvailable' });
  assert.deepEqual(asked, []);
});

test('offers an anonymous shell only fully rolled out updates', async () => {
  const partial = { ...bundle, rolloutPercent: 50 };
  const part = firstPart(
    (await service([partial]).manifests.respond(request({ installationId: undefined }))).body,
  );
  assert.deepEqual(part.json, { type: 'noUpdateAvailable' });
});

test('signs the manifest when the shell expects a signature', async () => {
  const { body } = await service([bundle], privateKey).manifests.respond(
    request({ expectsSignature: true }),
  );
  const part = firstPart(body);
  assert.ok(part.signature);
  assert.ok(
    createVerify('RSA-SHA256').update(part.content).verify(publicKey, part.signature, 'base64'),
  );
});

test('refuses to answer a signing shell unsigned', async () => {
  await assert.rejects(
    service([bundle]).manifests.respond(request({ expectsSignature: true })),
    ServiceUnavailableException,
  );
});

test('rejects requests outside the supported protocol', async () => {
  const { manifests } = service([bundle]);
  for (const overrides of [
    { protocolVersion: '0' },
    { protocolVersion: undefined },
    { platform: 'web' },
    { runtimeVersion: undefined },
  ])
    await assert.rejects(manifests.respond(request(overrides)), BadRequestException);
});
