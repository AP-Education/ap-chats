import assert from 'node:assert/strict';
import { test } from 'node:test';

import { withoutLinkEscapes } from './link-escapes.ts';

test('an older bare link opens as typed, without the escapes stored inside it', () => {
  assert.equal(
    withoutLinkEscapes('see https://example.com/a\\_b?utm\\_source=chat now'),
    'see https://example.com/a_b?utm_source=chat now',
  );
});

test('escapes outside links stay, so the text still reads the way it was written', () => {
  assert.equal(withoutLinkEscapes('snake\\_case \\*not bold\\*'), 'snake\\_case \\*not bold\\*');
});
