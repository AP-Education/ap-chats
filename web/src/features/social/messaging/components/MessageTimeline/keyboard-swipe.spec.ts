import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  closesOnRelease,
  closesWhileDragging,
  type KeyboardSwipe,
  moveSwipe,
  startSwipe,
} from './keyboard-swipe.ts';

function drag(points: [x: number, y: number, time: number][]): KeyboardSwipe {
  const [first, ...rest] = points.map(([x, y, time]) => ({ x, y, time }));
  return rest.reduce(moveSwipe, startSwipe(first!));
}

test('a short drag only scrolls the history', () => {
  const swipe = drag([
    [0, 0, 0],
    [0, 30, 120],
    [0, 60, 240],
  ]);

  assert.equal(closesWhileDragging(swipe), false);
  assert.equal(closesOnRelease(swipe), false);
});

test('a long pull down closes the keyboard before the finger lets go', () => {
  const swipe = drag([
    [0, 0, 0],
    [4, 70, 300],
    [6, 130, 600],
  ]);

  assert.equal(closesWhileDragging(swipe), true);
});

test('a quick flick down closes it on release', () => {
  const swipe = drag([
    [0, 0, 0],
    [0, 20, 16],
    [0, 45, 32],
    [0, 70, 48],
  ]);

  assert.equal(closesWhileDragging(swipe), false);
  assert.equal(closesOnRelease(swipe), true);
});

test('a flick that stopped before the finger lifted is a scroll', () => {
  const swipe = drag([
    [0, 0, 0],
    [0, 70, 48],
    [0, 72, 300],
  ]);

  assert.equal(closesOnRelease(swipe), false);
});

test('scrolling up to newer messages never closes it, however far or fast', () => {
  const swipe = drag([
    [0, 300, 0],
    [0, 200, 16],
    [0, 40, 32],
  ]);

  assert.equal(closesWhileDragging(swipe), false);
  assert.equal(closesOnRelease(swipe), false);
});

test('a sideways swipe, like swipe to reply, leaves the keyboard alone', () => {
  const swipe = drag([
    [0, 0, 0],
    [150, 60, 16],
    [220, 130, 32],
  ]);

  assert.equal(closesWhileDragging(swipe), false);
  assert.equal(closesOnRelease(swipe), false);
});
