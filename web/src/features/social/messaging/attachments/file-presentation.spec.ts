import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitFileName } from './file-presentation.ts';

test('the tail keeps the extension and a few letters before it', () => {
  assert.deepEqual(splitFileName('ap-app-release-0.12.1.apk'), {
    head: 'ap-app-release-0',
    tail: '.12.1.apk',
  });
});

test('a name without a short extension keeps only its last letters whole', () => {
  assert.deepEqual(splitFileName('Makefile'), { head: 'Mak', tail: 'efile' });
  assert.deepEqual(splitFileName('notes.markdown-backup'), {
    head: 'notes.markdown-b',
    tail: 'ackup',
  });
});

test('a short name stays whole in the tail', () => {
  assert.deepEqual(splitFileName('a.pdf'), { head: '', tail: 'a.pdf' });
});
