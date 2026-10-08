import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contrast } from './color.ts';
import { hues } from './palette.ts';

test('deep tones keep white text readable on own bubbles', () => {
  for (const [id, hue] of Object.entries(hues)) {
    for (const tone of hue.deep) {
      const ratio = contrast('#ffffff', tone);
      assert.ok(ratio >= 4.5, `${id} ${tone}: ${ratio.toFixed(2)}`);
    }
  }
});
