import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rgbaToThumbHash } from 'thumbhash';

import { badgeTone, luminance, mediaTones, regionAverage, type Rgb } from './media-tones.ts';

function image(width: number, height: number, paint: (x: number, y: number) => Rgb) {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rgba.set([...paint(x, y), 255], (y * width + x) * 4);
    }
  }
  return { w: width, h: height, rgba };
}

test('a region averages only its own pixels', () => {
  const halves = image(4, 2, (x) => (x < 2 ? [200, 0, 0] : [0, 0, 200]));

  assert.deepEqual(regionAverage(halves, { x: 0, y: 0, width: 0.5, height: 1 }), [200, 0, 0]);
  assert.deepEqual(regionAverage(halves, { x: 0, y: 0, width: 1, height: 1 }), [100, 0, 100]);
});

test('a badge keeps its corner hue, darkened just enough for white text', () => {
  const sky: Rgb = [150, 200, 250];
  const tone = badgeTone(sky);

  assert.ok(luminance(tone) <= 0.18);
  assert.ok(tone[2] > tone[1] && tone[1] > tone[0], 'still blue');
  assert.deepEqual(badgeTone([20, 30, 40]), [20, 30, 40], 'already dark enough');
});

test('each badge takes the colour of the corner it sits on', () => {
  const corners = image(32, 32, (x, y) => (x < 16 && y < 16 ? [220, 40, 40] : [40, 40, 220]));
  const hash = Buffer.from(rgbaToThumbHash(corners.w, corners.h, corners.rgba)).toString('base64');
  const read = (color: string) => color.match(/\d+/g)!.slice(0, 3).map(Number);

  const [startRed, , startBlue] = read(mediaTones(hash).topLeft);
  const [endRed, , endBlue] = read(mediaTones(hash).bottomRight);
  assert.ok(startRed > startBlue, 'the top left badge reads red');
  assert.ok(endBlue > endRed, 'the bottom right badge reads blue');
});
