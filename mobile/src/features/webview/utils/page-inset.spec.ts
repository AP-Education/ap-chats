import assert from 'node:assert/strict';
import { test } from 'node:test';

import { insetBottomScript, pageBottom, pageKeyboardInset } from './page-inset';

test('a page down to the screen edge pads for the keyboard less the system bar', () => {
  assert.equal(pageKeyboardInset(345, pageBottom(0, 34)), 311);
  assert.equal(pageKeyboardInset(0, pageBottom(0, 34)), 0);
  // Android's navigation bar is the room the input keeps while closed: nothing to pad beyond it.
  assert.equal(pageKeyboardInset(48, pageBottom(0, 48)), 0);
  assert.equal(pageKeyboardInset(300, pageBottom(0, 48)), 252);
});

test('a page ending above the screen edge pads only for what reaches it', () => {
  assert.equal(pageBottom(48, 48).safeArea, 0);
  assert.equal(pageKeyboardInset(48, pageBottom(48, 48)), 0);
  assert.equal(pageKeyboardInset(300, pageBottom(48, 48)), 252);
});

test('the bottom inset is written into the page as the shell reads it', () => {
  assert.match(insetBottomScript(34), /setProperty\('--app-inset-bottom', '34px'\)/);
});
