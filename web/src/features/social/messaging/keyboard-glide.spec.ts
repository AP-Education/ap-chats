import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readKeyboardGlide } from './components/MessageComposer/native-input.ts';
import { GLIDE_REST, glideReducer, glideSurfaceProps } from './keyboard-glide.ts';

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
