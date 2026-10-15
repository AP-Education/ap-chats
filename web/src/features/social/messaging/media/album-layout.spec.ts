import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type Album, albumLayout } from './album-layout.ts';

const portrait = { width: 1170, height: 2532 };
const landscape = { width: 1920, height: 1080 };
const square = { width: 1000, height: 1000 };

function assertFills(album: Album) {
  for (const tile of album.tiles) {
    assert.ok(tile.x >= 0 && tile.y >= 0, 'starts inside');
    assert.ok(tile.x + tile.width <= album.width + 0.01, 'ends inside the width');
    assert.ok(tile.y + tile.height <= album.height + 0.01, 'ends inside the height');
  }
}

test('two photos stand side by side at one height, filling the width', () => {
  const album = albumLayout([portrait, square]);
  const [first, second] = album.tiles;

  assert.equal(first!.height, second!.height);
  assert.ok(Math.abs(second!.x + second!.width - album.width) < 0.01);
  assertFills(album);
});

test('two wide photos stack instead of shrinking into a strip', () => {
  const [first, second] = albumLayout([landscape, landscape]).tiles;

  assert.equal(first!.width, second!.width);
  assert.ok(second!.y > first!.y);
});

test('a wide first photo leads across the top, the rest share one row under it', () => {
  const album = albumLayout([landscape, square, portrait]);
  const [lead, ...rest] = album.tiles;

  assert.equal(lead!.width, album.width);
  assert.ok(rest.every((tile) => tile.y > lead!.height && tile.height === rest[0]!.height));
  assertFills(album);
});

test('a tall first photo stands on the left at full height, the rest stacked beside it', () => {
  const album = albumLayout([portrait, square, landscape, square]);
  const [lead, ...rest] = album.tiles;

  assert.ok(Math.abs(lead!.height - album.height) < 0.01);
  assert.ok(rest.every((tile) => tile.x > lead!.width && tile.width === rest[0]!.width));
  assertFills(album);
});

test('five or more photos fall into rows of two and three, shorter rows first', () => {
  const album = albumLayout(Array(5).fill(square));
  const rowsByTop = new Map<number, number>();
  for (const tile of album.tiles) rowsByTop.set(tile.y, (rowsByTop.get(tile.y) ?? 0) + 1);

  assert.deepEqual([...rowsByTop.values()], [2, 3]);
  assertFills(album);
});
