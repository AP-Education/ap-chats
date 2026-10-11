import assert from 'node:assert/strict';
import { test } from 'node:test';

import { tokenizeTypedEveryone } from './typed-everyone';

test('a typed @everyone becomes the mention token', () => {
  assert.equal(tokenizeTypedEveryone('@everyone збір о 10'), ':mention[everyone] збір о 10');
  assert.equal(tokenizeTypedEveryone('увага, @everyone.'), 'увага, :mention[everyone].');
});

test('code, addresses and longer words keep the text as written', () => {
  assert.equal(
    tokenizeTypedEveryone('`@everyone` і @everyone'),
    '`@everyone` і :mention[everyone]',
  );
  assert.equal(tokenizeTypedEveryone('```\n@everyone\n```'), '```\n@everyone\n```');
  assert.equal(
    tokenizeTypedEveryone('team@everyone.com @everyones'),
    'team@everyone.com @everyones',
  );
});
