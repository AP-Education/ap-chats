import assert from 'node:assert/strict';
import { test } from 'node:test';

import { i18n, i18nReady } from '../../../shared/i18n/i18n';
import {
  type MentionToken,
  previewText,
  readToken,
  splitTokens,
  tokenAttributes,
  tokenFromAttributes,
  tokenText,
  writeToken,
} from './mention-tokens';

await i18nReady('uk');
const t = i18n.getFixedT('uk', 'mentions');
const id = '123e4567-e89b-42d3-a456-426614174000';

test('every reference splits out and writes back as it was', () => {
  const markdown = `Hi :member[${id}] and :role[${id}], see :channel[${id}] :mention[everyone]`;
  const parts = splitTokens(markdown);

  assert.deepEqual(parts, [
    'Hi ',
    { kind: 'member', id },
    ' and ',
    { kind: 'role', id },
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
    previewText(`:mention[everyone]\nзустріч у :channel[${id}] з :member[${id}] і :role[${id}]`, t),
    '@everyone зустріч у #канал з @учасник і @роль',
  );
});

test('a directive is a reference only by its exact name and label', () => {
  assert.deepEqual(readToken('mention', 'everyone'), { kind: 'everyone' });
  assert.equal(readToken('mention', 'team'), null);
  assert.equal(readToken('member', 'general'), null);
  assert.deepEqual(readToken('role', id), { kind: 'role', id });
  assert.equal(readToken('role', 'design'), null);
  assert.equal(readToken('link', id), null);
});

test('each kind of reference survives the trip through rendered attributes', () => {
  const tokens: MentionToken[] = [
    { kind: 'member', id },
    { kind: 'role', id },
    { kind: 'channel', id },
    { kind: 'everyone' },
  ];

  for (const token of tokens) assert.deepEqual(tokenFromAttributes(tokenAttributes(token)), token);
  assert.equal(tokenFromAttributes({ 'data-mention': 'link', 'data-mention-id': id }), null);
  assert.equal(tokenFromAttributes({ 'data-mention': 'toString' }), null);
});

test('a reference reads by its name where known, otherwise by what it is', () => {
  assert.equal(tokenText({ kind: 'role', id }, t, 'дизайн'), '@дизайн');
  assert.equal(tokenText({ kind: 'role', id }, t), '@роль');
  assert.equal(tokenText({ kind: 'channel', id }, t, 'загальне'), '#загальне');
  assert.equal(tokenText({ kind: 'everyone' }, t), '@everyone');
});
