import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextReadinessStep } from './readiness-step';

test('the full screen comes first: without it a call only buzzes on a dark screen', () => {
  assert.equal(nextReadinessStep({ fullScreen: false, background: false }, false), 'fullScreen');
  assert.equal(nextReadinessStep({ fullScreen: true, background: false }, false), 'background');
  assert.equal(nextReadinessStep({ fullScreen: true, background: true }, false), null);
});

test('once put off, nothing is asked again', () => {
  assert.equal(nextReadinessStep({ fullScreen: false, background: false }, true), null);
});
