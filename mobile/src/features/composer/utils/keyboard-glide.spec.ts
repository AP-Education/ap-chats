import assert from 'node:assert/strict';
import { test } from 'node:test';

import { glideDirection, glideEasing } from './keyboard-glide';

const frames = (heights: number[], times: number[]) =>
  heights.map((height, index) => ({ height, time: times[index]! }));

test('only the keyboard alone, rising from nothing or falling to nothing, glides', () => {
  assert.equal(glideDirection(0, 336, true), 'up');
  assert.equal(glideDirection(336, 0, true), 'down');
  assert.equal(glideDirection(336, 290, true), null);
  assert.equal(glideDirection(0, 336, false), null);
});

test('each frame lands at the moment it was reported, in either direction', () => {
  const rise = frames([60, 180, 280, 330], [16, 32, 48, 64]);
  assert.equal(
    glideEasing(rise, 0, 336, 0, 80),
    'linear(0, 0.179 20.0%, 0.536 40.0%, 0.833 60.0%, 0.982 80.0%, 1)',
  );

  const fall = frames([276, 156, 56, 6], [16, 32, 48, 64]);
  assert.equal(
    glideEasing(fall, 336, 0, 0, 80),
    'linear(0, 0.179 20.0%, 0.536 40.0%, 0.833 60.0%, 0.982 80.0%, 1)',
  );
});

test('a dropped frame leaves a gap in time instead of bending the curve', () => {
  const skipped = frames([60, 280, 330, 336], [16, 48, 64, 80]);
  assert.equal(
    glideEasing(skipped, 0, 336, 0, 80),
    'linear(0, 0.179 20.0%, 0.833 60.0%, 0.982 80.0%, 1.000 100.0%, 1)',
  );
});

test('too few frames, no travel, no time or a reversing keyboard keep the previous curve', () => {
  const times = [16, 32, 48, 64];
  assert.equal(glideEasing(frames([100, 336], [16, 32]), 0, 336, 0, 80), null);
  assert.equal(glideEasing(frames([60, 200, 120, 330], times), 0, 336, 0, 80), null);
  assert.equal(glideEasing(frames([60, 180, 280, 330], times), 336, 336, 0, 80), null);
  assert.equal(glideEasing(frames([60, 180, 280, 330], times), 0, 336, 80, 80), null);
});
