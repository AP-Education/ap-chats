import assert from 'node:assert/strict';
import { test } from 'node:test';

import { videoDuration } from './video-duration.ts';

test('video duration uses a stable minute or hour clock without rounding across boundaries', () => {
  assert.equal(videoDuration(0.5), '0:00');
  assert.equal(videoDuration(59.9), '0:59');
  assert.equal(videoDuration(60), '1:00');
  assert.equal(videoDuration(3601), '1:00:01');
  for (const value of [undefined, 0, -1, NaN, Infinity])
    assert.equal(videoDuration(value), undefined);
});
