import assert from 'node:assert/strict';
import { test } from 'node:test';

import { glideDirection, glideEasing } from './keyboard-glide';

test('only the keyboard alone, rising from nothing or falling to nothing, glides', () => {
  assert.equal(glideDirection(0, 336, true), 'up');
  assert.equal(glideDirection(336, 0, true), 'down');
  assert.equal(glideDirection(336, 290, true), null);
  assert.equal(glideDirection(0, 336, false), null);
});

test('the reported heights become a linear easing in either direction', () => {
  assert.equal(
    glideEasing([60, 180, 280, 330], 0, 336),
    'linear(0, 0.179, 0.536, 0.833, 0.982, 1)',
  );
  assert.equal(glideEasing([276, 156, 56, 6], 336, 0), 'linear(0, 0.179, 0.536, 0.833, 0.982, 1)');
});

test('too few frames, no travel or a reversing keyboard keep the previous curve', () => {
  assert.equal(glideEasing([100, 336], 0, 336), null);
  assert.equal(glideEasing([60, 200, 120, 330], 0, 336), null);
  assert.equal(glideEasing([60, 180, 280, 330], 336, 336), null);
});
