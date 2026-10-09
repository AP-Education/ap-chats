import assert from 'node:assert/strict';
import { test } from 'node:test';

import { glideEasing } from './keyboard-glide';

test('the reported heights become a linear easing that ends on the final height', () => {
  assert.equal(glideEasing([60, 180, 280, 330], 336), 'linear(0, 0.179, 0.536, 0.833, 0.982, 1)');
});

test('too few frames or a reversing keyboard keep the previous curve', () => {
  assert.equal(glideEasing([100, 336], 336), null);
  assert.equal(glideEasing([60, 200, 120, 330], 336), null);
  assert.equal(glideEasing([60, 180, 280, 330], 0), null);
});
