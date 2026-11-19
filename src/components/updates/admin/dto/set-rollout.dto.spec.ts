import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { SetRolloutDto } from './set-rollout.dto';

const errors = (body: object) => validateSync(plainToInstance(SetRolloutDto, body));

test('takes resume as true, false or left out, but not null', () => {
  assert.deepEqual(errors({ percent: 50 }), []);
  assert.deepEqual(errors({ percent: 50, resume: true }), []);
  assert.deepEqual(errors({ percent: 50, resume: false }), []);
  assert.equal(errors({ percent: 50, resume: null }).length, 1);
});
