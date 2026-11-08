import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseComposerDraft } from './composer-draft';

test('restoring private text or empty private mode retains its audience', () => {
  for (const markdown of ['Особистий запит', '']) {
    assert.equal(parseComposerDraft(JSON.stringify({ markdown, assistant: true })).assistant, true);
  }
  assert.equal(
    parseComposerDraft(JSON.stringify({ markdown: 'старий формат', labels: {} })).assistant,
    false,
  );
  assert.equal(parseComposerDraft('звичайна давня чернетка').markdown, 'звичайна давня чернетка');
});

test('invalid audience metadata cannot downgrade a saved draft to public', () => {
  for (const assistant of [null, 'true', {}, 0]) {
    assert.equal(
      parseComposerDraft(JSON.stringify({ markdown: 'Приватне', assistant })).assistant,
      true,
    );
  }
  assert.deepEqual(
    parseComposerDraft(
      JSON.stringify({ markdown: 'текст', labels: { good: 'Ім’я', bad: 5 }, assistant: false }),
    ),
    { markdown: 'текст', labels: { good: 'Ім’я' }, assistant: false },
  );
});
