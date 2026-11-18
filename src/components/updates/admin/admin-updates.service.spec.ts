import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ConflictException } from '@nestjs/common';

import type { Logger } from '@/globals/logger';

import type { UpdatesRepository } from '../repository';
import type { NewAppUpdate } from '../types';
import { AdminUpdatesService } from './admin-updates.service';
import type { PublishUpdateDto } from './dto';

function service(hasRuntime = true) {
  const created: NewAppUpdate[] = [];
  const repository = {
    hasRuntime: () => Promise.resolve(hasRuntime),
    create: (update: NewAppUpdate) => {
      created.push(update);
      return Promise.resolve('new-id');
    },
  } as unknown as UpdatesRepository;
  const logger = { info: () => undefined } as unknown as Logger;
  return { admin: new AdminUpdatesService(repository, logger), created };
}

const manifest = {
  launchAsset: { hash: 'h', key: 'k', contentType: 'application/javascript', url: 'https://x' },
  assets: [],
  expoClient: { name: 'AP App' },
};
const dto = (overrides: Partial<PublishUpdateDto> = {}): PublishUpdateDto => ({
  platform: 'ios',
  channel: 'production',
  runtimeVersion: 'fp-1',
  manifest,
  ...overrides,
});

test('starts a production update at 10% and a preview one for everyone', async () => {
  const { admin, created } = service();

  assert.deepEqual(await admin.publish(dto()), { id: 'new-id' });
  await admin.publish(dto({ channel: 'preview' }));

  assert.deepEqual(
    created.map(({ channel, rolloutPercent }) => ({ channel, rolloutPercent })),
    [
      { channel: 'production', rolloutPercent: 10 },
      { channel: 'preview', rolloutPercent: 100 },
    ],
  );
  assert.deepEqual(created[0], {
    kind: 'update',
    platform: 'ios',
    channel: 'production',
    runtimeVersion: 'fp-1',
    manifest,
    rolloutPercent: 10,
    mandatory: false,
    sourceUpdateId: null,
    gitCommit: null,
    notes: null,
    createdBy: null,
  });
});

test('keeps an explicit rollout and the publish details', async () => {
  const { admin, created } = service();
  await admin.publish(
    dto({
      rolloutPercent: 0,
      mandatory: true,
      gitCommit: 'abc1234',
      notes: 'fix',
      createdBy: 'ci',
    }),
  );
  assert.equal(created[0]!.rolloutPercent, 0);
  assert.equal(created[0]!.mandatory, true);
  assert.equal(created[0]!.gitCommit, 'abc1234');
});

test('refuses an update for a runtime no store build ships', async () => {
  const { admin, created } = service(false);
  await assert.rejects(admin.publish(dto()), ConflictException);
  assert.deepEqual(created, []);
});
