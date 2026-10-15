import assert from 'node:assert/strict';
import { test } from 'node:test';

import sharp from 'sharp';
import { thumbHashToAverageRGBA } from 'thumbhash';

import { imagePlaceholder } from './image-placeholder';

test('a photo is kept as a short ThumbHash that still reads in its own colour', async () => {
  const red = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 220, g: 30, b: 30 } },
  })
    .png()
    .toBuffer();

  const placeholder = await imagePlaceholder(red);
  const { r, g, b } = thumbHashToAverageRGBA(Buffer.from(placeholder, 'base64'));

  assert.ok(placeholder.length <= 64);
  assert.ok(r > 0.7 && g < 0.25 && b < 0.25);
});
