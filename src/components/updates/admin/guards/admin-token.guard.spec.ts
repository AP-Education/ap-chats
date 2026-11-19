import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import type { AppConfigService } from '@/globals/config';

import { AdminTokenGuard } from './admin-token.guard';

const token = 'a'.repeat(40);
const guard = (configured?: string) =>
  new AdminTokenGuard({ get: () => configured } as unknown as AppConfigService);
const context = (authorization?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  }) as unknown as ExecutionContext;

test('lets in a request with the configured token', () => {
  assert.equal(guard(token).canActivate(context(`Bearer ${token}`)), true);
});

test('turns everyone away when no token is configured', () => {
  assert.throws(() => guard().canActivate(context(`Bearer ${token}`)), UnauthorizedException);
});

test('rejects a missing, malformed or wrong token', () => {
  for (const header of [undefined, token, `Basic ${token}`, `Bearer ${'b'.repeat(40)}`, 'Bearer '])
    assert.throws(() => guard(token).canActivate(context(header)), UnauthorizedException);
});
