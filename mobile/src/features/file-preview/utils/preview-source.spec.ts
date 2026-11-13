import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filePreviewSource, requestedFilePreview } from './preview-source';

test('a file preview preserves the signed download address', () => {
  const uri =
    'https://files.example.test/attachment?signature=fixture%2Bonly&response-content-disposition=attachment';
  assert.deepEqual(filePreviewSource(uri), { uri });
});

test('local development attachments can be previewed over HTTP', () => {
  const uri = 'http://127.0.0.1:5586/files/sample.md';
  assert.deepEqual(filePreviewSource(uri), { uri });
});

test('malformed, executable and local-file addresses are not previewed', () => {
  for (const uri of [
    'not a URL',
    '/relative/file',
    'javascript:alert(1)',
    'file:///private/file',
    'data:text/html,hello',
  ]) {
    assert.equal(filePreviewSource(uri), null);
  }
});

test('a signed download is previewed before the storage response is known', () => {
  const url =
    'https://files.example.test/object?signature=fixture&response-content-disposition=attachment%3B%20filename%3D%22document.pdf%22';
  assert.deepEqual(requestedFilePreview({ url, isTopFrame: true }), { uri: url });
});

test('app navigation and inline previews remain inside their existing document', () => {
  for (const url of [
    'https://app.example.test/c/direct/chat',
    'https://files.example.test/object?response-content-disposition=inline',
  ]) {
    assert.equal(requestedFilePreview({ url, isTopFrame: true }), null);
  }
});

test('an embedded frame cannot open the native file preview', () => {
  const url = 'https://files.example.test/object?response-content-disposition=attachment';
  assert.equal(requestedFilePreview({ url, isTopFrame: false }), null);
  assert.equal(requestedFilePreview({ url }), null);
});
