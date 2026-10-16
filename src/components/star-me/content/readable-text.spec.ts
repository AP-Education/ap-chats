import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readableText } from './readable-text';

test('a message reads with its mentions named', async () => {
  const id = '8f6b3c2a-1d4e-4f5a-9b7c-0e1d2c3b4a59';

  const text = await readableText(`:member[${id}] глянь, будь ласка`, [
    { memberId: id, displayName: 'Ілля' },
  ]);

  assert.equal(text, '@Ілля глянь, будь ласка');
});

test('a mention of someone who left reads as a member', async () => {
  const text = await readableText(':member[8f6b3c2a-1d4e-4f5a-9b7c-0e1d2c3b4a59] привіт', []);

  assert.equal(text, '@учасник привіт');
});
