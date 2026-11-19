import assert from 'node:assert/strict';
import { test } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ReportLaunchDto } from './report-launch.dto';

const valid = {
  platform: 'android',
  runtimeVersion: 'fp-1',
  updateId: '6f1c2c1e-3b8e-4c1a-9b7a-2d1e0f9a8b7c',
  isEmergencyLaunch: false,
  ok: true,
};
const errors = (body: object) => validateSync(plainToInstance(ReportLaunchDto, body));

test('accepts a launch of a published or an embedded bundle', () => {
  assert.equal(errors(valid).length, 0);
  assert.equal(errors({ ...valid, updateId: null }).length, 0);
});

test('rejects malformed launches', () => {
  for (const body of [
    { ...valid, platform: 'web' },
    { ...valid, runtimeVersion: '' },
    { ...valid, updateId: 'not-a-uuid' },
    { ...valid, updateId: undefined },
    { ...valid, ok: 'yes' },
  ])
    assert.notEqual(errors(body).length, 0, JSON.stringify(body));
});
