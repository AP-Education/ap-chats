import assert from 'node:assert/strict';
import { test } from 'node:test';

import { previewText, readToken, splitTokens, writeToken } from './mention-tokens';

const id = '123e4567-e89b-42d3-a456-426614174000';

test('every reference splits out and writes back as it was', () => {
  const markdown = `Hi :member[${id}], see :channel[${id}] :mention[everyone]`;
  const parts = splitTokens(markdown);

  assert.deepEqual(parts, [
    'Hi ',
    { kind: 'member', id },
    ', see ',
    { kind: 'channel', id },
    ' ',
    { kind: 'everyone' },
    '',
  ]);
  assert.equal(
    parts.map((part) => (typeof part === 'string' ? part : writeToken(part))).join(''),
    markdown,
  );
});

test('a preview reads every reference as a word on one line', () => {
  assert.equal(
    previewText(`:mention[everyone]\nзустріч у :channel[${id}] з :member[${id}]`),
    '@everyone зустріч у #канал з @учасник',
  );
});

test('a directive is a reference only by its exact name and label', () => {
  assert.deepEqual(readToken('mention', 'everyone'), { kind: 'everyone' });
  assert.equal(readToken('mention', 'team'), null);
  assert.equal(readToken('member', 'general'), null);
  assert.equal(readToken('link', id), null);
});
