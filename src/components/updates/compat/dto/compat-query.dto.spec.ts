import assert from 'node:assert/strict';
import { test } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CompatQueryDto } from './compat-query.dto';

const errors = (query: object) => validateSync(plainToInstance(CompatQueryDto, query));

test('accepts the native shell platforms', () => {
  assert.equal(errors({ platform: 'ios' }).length, 0);
  assert.equal(errors({ platform: 'android' }).length, 0);
});

test('rejects a missing or unknown platform', () => {
  assert.notEqual(errors({}).length, 0);
  assert.notEqual(errors({ platform: 'web' }).length, 0);
});
