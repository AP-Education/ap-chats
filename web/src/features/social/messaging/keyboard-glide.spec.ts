import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readKeyboardGlide } from './components/MessageComposer/native-input.ts';
import { GLIDE_REST, glideReducer, glideSurfaceProps, insetGlide } from './keyboard-glide.ts';

const motion = { shift: 302, duration: 250, easing: 'linear(0, 0.4 30%, 0.9 70%, 1)' };
const glide = (direction: 'up' | 'down') =>
  ({ type: 'keyboard/glide', direction, ...motion }) as const;

test('a rise slides up at once and lets go when the page shrinks', () => {
  const rising = glideReducer(GLIDE_REST, glide('up'));

  assert.equal(glideSurfaceProps(rising)['data-keyboard-glide'], 'rising');
  assert.deepEqual(glideReducer(rising, { type: 'resized' }), GLIDE_REST);
});

test('a fall waits for the page to grow, plays, and comes to rest', () => {
  const awaiting = glideReducer(GLIDE_REST, glide('down'));
  assert.deepEqual(glideSurfaceProps(awaiting), {});

  const falling = glideReducer(awaiting, { type: 'resized' });
  assert.equal(glideSurfaceProps(falling)['data-keyboard-glide'], 'falling');

  const ended = glideReducer(falling, { type: 'keyboard/glide-end' });
  assert.deepEqual(glideReducer(ended, { type: 'settled' }), GLIDE_REST);
});

test('a glide no resize ends is let go instead of hanging', () => {
  for (const direction of ['up', 'down'] as const) {
    const moving = glideReducer(GLIDE_REST, glide(direction));
    assert.deepEqual(glideReducer(moving, { type: 'expired' }), GLIDE_REST);
  }
});

test('a rise carries the keyboard curve onto the surface', () => {
  const { style } = glideSurfaceProps(glideReducer(GLIDE_REST, glide('up')));

  assert.equal((style as Record<string, string>)['--keyboard-glide-easing'], motion.easing);
});

test('messages from older shells read as rises, and unsafe or malformed parts are dropped', () => {
  const olderShell = { type: 'keyboard/glide', ...motion };
  assert.deepEqual(readKeyboardGlide(olderShell), glide('up'));

  const unsafe = readKeyboardGlide({ type: 'keyboard/glide', ...motion, easing: 'url(x)' });
  assert.deepEqual(unsafe, { type: 'keyboard/glide', direction: 'up', shift: 302, duration: 250 });

  assert.equal(readKeyboardGlide({ type: 'keyboard/glide', ...motion, shift: 'far' }), null);
});

test('a new inset glides from the old one, by how far it moved', () => {
  const rise = insetGlide({ type: 'keyboard/inset', inset: 302, duration: 250 }, 0);
  assert.deepEqual(rise, { ...glide('up'), easing: undefined });

  const fall = insetGlide({ type: 'keyboard/inset', ...motion, inset: 257 }, 302);
  assert.deepEqual(fall, { ...glide('down'), shift: 45 });

  assert.equal(insetGlide({ type: 'keyboard/inset', inset: 0, duration: 0 }, 302), null);
  assert.equal(insetGlide({ type: 'keyboard/inset', inset: 302, duration: 250 }, 302), null);
});

test('insets from the shell are read, with an unsafe curve dropped', () => {
  const inset = { type: 'keyboard/inset', inset: 302, duration: 250, easing: motion.easing };
  assert.deepEqual(readKeyboardGlide(inset), inset);
  const uneased = { type: 'keyboard/inset', inset: 302, duration: 250 };
  assert.deepEqual(readKeyboardGlide({ ...inset, easing: 'linear' }), uneased);
  assert.equal(readKeyboardGlide({ ...inset, inset: '302' }), null);
});
