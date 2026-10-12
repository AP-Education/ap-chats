import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pageBottom, pageKeyboardInset } from './page-inset';

test('an iOS page down to the screen edge pads for the keyboard less the home indicator', () => {
  assert.equal(pageKeyboardInset(345, pageBottom(0, 34, true)), 311);
  assert.equal(pageKeyboardInset(0, pageBottom(0, 34, true)), 0);
});

test('a page ending above the screen edge pads only for what reaches it', () => {
  // Android keeps the page above the navigation bar, and its WebView reports no safe area.
  assert.equal(pageKeyboardInset(48, pageBottom(48, 48, false)), 0);
  assert.equal(pageKeyboardInset(300, pageBottom(48, 48, false)), 252);
});

test('a page under the navigation bar pads for the bar too', () => {
  assert.equal(pageKeyboardInset(48, pageBottom(0, 48, false)), 48);
  assert.equal(pageKeyboardInset(300, pageBottom(0, 48, false)), 300);
});
