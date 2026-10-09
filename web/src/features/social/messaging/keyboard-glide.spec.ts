import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GLIDE_REST, glideReducer, glideSurfaceProps, readKeyboardGlide } from './keyboard-glide';

const motion = { shift: 302, duration: 250, easing: 'linear(0, 0.4, 0.9, 1)' };

test('a rise slides up at once and lets go when the page shrinks', () => {
  const rising = glideReducer(GLIDE_REST, { type: 'keyboard/glide', direction: 'up', ...motion });
  assert.deepEqual(rising, { kind: 'rising', ...motion });
  assert.equal(glideSurfaceProps(rising)['data-keyboard-glide'], 'rising');
  assert.deepEqual(glideReducer(rising, { type: 'resized' }), GLIDE_REST);
});

test('a fall waits for the page to grow before letting the parts down', () => {
  const awaiting = glideReducer(GLIDE_REST, {
    type: 'keyboard/glide',
    direction: 'down',
    ...motion,
  });
  assert.deepEqual(glideSurfaceProps(awaiting), {});
  const falling = glideReducer(awaiting, { type: 'resized' });
  assert.equal(glideSurfaceProps(falling)['data-keyboard-glide'], 'falling');
});

test('a glide no resize ends is let go instead of hanging', () => {
  const rising = glideReducer(GLIDE_REST, { type: 'keyboard/glide', direction: 'up', ...motion });
  assert.deepEqual(glideReducer(rising, { type: 'expired' }), GLIDE_REST);
});

test('messages from older shells read as rises, and malformed ones are dropped', () => {
  assert.deepEqual(readKeyboardGlide({ type: 'keyboard/glide', ...motion }), {
    type: 'keyboard/glide',
    direction: 'up',
    ...motion,
  });
  assert.equal(readKeyboardGlide({ type: 'keyboard/glide', ...motion, easing: 'url(x)' }), null);
  assert.equal(readKeyboardGlide({ type: 'keyboard/glide', ...motion, shift: 'far' }), null);
});
