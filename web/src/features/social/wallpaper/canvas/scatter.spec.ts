import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRandom, packDisks, scatterOnTorus, seedFrom, torusDistance } from './scatter.ts';

test('mixed sizes pack without overlapping, even across tile edges', () => {
  const size = 560;
  const radii = [44, 44, 30, 30, 30, 30, 30, 18, 18, 18, 18, 18, 18, 18, 18, 18];
  const disks = packDisks(size, radii, 12, createRandom(5));

  assert.equal(disks.length, radii.length);
  for (const [index, disk] of disks.entries()) {
    for (const other of disks.slice(index + 1)) {
      assert.ok(torusDistance(disk, other, size) >= disk.radius + other.radius + 12);
    }
  }
});

test('the same seed always scatters the same points', () => {
  const first = scatterOnTorus(480, 50, createRandom(seedFrom('school')));
  const second = scatterOnTorus(480, 50, createRandom(seedFrom('school')));

  assert.deepEqual(first, second);
});

test('points keep their spacing across tile edges too', () => {
  const size = 480;
  const spacing = 50;
  const points = scatterOnTorus(size, spacing, createRandom(7));

  for (const [index, point] of points.entries()) {
    assert.ok(point.x >= 0 && point.x < size && point.y >= 0 && point.y < size);
    for (const other of points.slice(index + 1)) {
      assert.ok(torusDistance(point, other, size) >= spacing);
    }
  }
});

test('the tile is filled without holes, not just spaced', () => {
  const size = 480;
  const spacing = 50;
  const points = scatterOnTorus(size, spacing, createRandom(11));

  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 16) {
      const nearest = Math.min(...points.map((point) => torusDistance(point, { x, y }, size)));
      assert.ok(nearest < spacing * 2, `hole at ${x},${y}`);
    }
  }
});
