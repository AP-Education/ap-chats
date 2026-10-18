import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CallCheck } from '../../../../modules/call-readiness';
import { nextReadinessStep } from './readiness-step';

function checks(fullScreen: boolean, unrestricted: boolean): CallCheck[] {
  return [
    { id: 'notifications', ok: false },
    { id: 'fullScreen', ok: fullScreen },
    { id: 'unrestricted', ok: unrestricted },
  ];
}

test('the full screen comes first: without it a call only buzzes on a dark screen', () => {
  assert.equal(nextReadinessStep(checks(false, false), false), 'fullScreen');
  assert.equal(nextReadinessStep(checks(true, false), false), 'unrestricted');
  assert.equal(nextReadinessStep(checks(true, true), false), null);
});

test('once put off, nothing is asked again', () => {
  assert.equal(nextReadinessStep(checks(false, false), true), null);
});
