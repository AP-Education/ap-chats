import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitMedia } from './media-fit.ts';

test('a large photo shrinks into the box by its longer side', () => {
  assert.deepEqual(fitMedia({ width: 1170, height: 2532 }), { width: 194, height: 420 });
  assert.deepEqual(fitMedia({ width: 1920, height: 1080 }), { width: 420, height: 236 });
});

test('a small one keeps its own size', () => {
  assert.deepEqual(fitMedia({ width: 120, height: 80 }), { width: 120, height: 80 });
});
