import assert from 'node:assert/strict';
import { test } from 'node:test';

import { keyboardDirection, learnedMotion } from './keyboard-curve';

const frames = (heights: number[], times: number[]) =>
  heights.map((height, index) => ({ height, time: times[index]! }));

test('only a keyboard rising from nothing or falling to nothing teaches the curve', () => {
  assert.equal(keyboardDirection(0, 336), 'up');
  assert.equal(keyboardDirection(336, 0), 'down');
  assert.equal(keyboardDirection(336, 290), null);
});

test('the move lasts until its last frame and each frame lands when it was reported', () => {
  const rise = frames([60, 180, 280, 336], [20, 40, 60, 80]);

  assert.deepEqual(learnedMotion(rise, 0, 336, 0), {
    duration: 80,
    easing: 'linear(0, 0.179 25.0%, 0.536 50.0%, 0.833 75.0%, 1.000 100.0%, 1)',
  });
});

test('a fall reads the same way, and a dropped frame leaves a gap in time', () => {
  const fall = frames([276, 56, 6, 0], [20, 60, 80, 100]);

  assert.deepEqual(learnedMotion(fall, 336, 0, 0), {
    duration: 100,
    easing: 'linear(0, 0.179 20.0%, 0.833 60.0%, 0.982 80.0%, 1.000 100.0%, 1)',
  });
});

test('too few frames, no travel or a reversing keyboard teach nothing', () => {
  const times = [20, 40, 60, 80];
  assert.equal(learnedMotion(frames([100, 336], [20, 40]), 0, 336, 0), null);
  assert.equal(learnedMotion(frames([60, 200, 120, 330], times), 0, 336, 0), null);
  assert.equal(learnedMotion(frames([60, 180, 280, 330], times), 336, 336, 0), null);
});
