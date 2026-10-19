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

const fresh = { putOff: false, rangInTheDark: false };
const putOff = { putOff: true, rangInTheDark: false };
const putOffThenRang = { putOff: true, rangInTheDark: true };

test('the full screen comes first: without it a call only buzzes on a dark screen', () => {
  assert.equal(nextReadinessStep(checks(false, false), fresh), 'fullScreen');
  assert.equal(nextReadinessStep(checks(true, false), fresh), 'unrestricted');
  assert.equal(nextReadinessStep(checks(true, true), fresh), null);
});

test('once put off, nothing is asked again', () => {
  assert.equal(nextReadinessStep(checks(false, false), putOff), null);
});

test('a call that rang in the dark asks for the full screen again, and for nothing else', () => {
  assert.equal(nextReadinessStep(checks(false, false), putOffThenRang), 'fullScreen');
  assert.equal(nextReadinessStep(checks(true, false), putOffThenRang), null);
});
