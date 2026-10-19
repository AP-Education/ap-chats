import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ShareIntent } from 'expo-share-intent';

import { receivedShare } from './received-share';

const photo = {
  fileName: 'IMG_0001.jpg',
  mimeType: 'image/jpeg',
  path: 'file:///cache/IMG_0001.jpg',
  size: 2_567_402,
  width: 800,
  height: 600,
  duration: null,
};

function intent(share: Partial<ShareIntent>): ShareIntent {
  return { files: null, text: null, webUrl: null, type: null, ...share };
}

test('the page gets the files without their paths, which stay with native', () => {
  const share = receivedShare(intent({ files: [photo], type: 'media' }), 'share', () => 0);

  assert.deepEqual(share?.content, {
    id: 'share',
    text: null,
    files: [{ id: 'share:0', name: 'IMG_0001.jpg', size: 2_567_402, type: 'image/jpeg' }],
  });
  assert.deepEqual(share?.paths, { 'share:0': 'file:///cache/IMG_0001.jpg' });
});

test('a file shared without its size is measured on disk', () => {
  const share = receivedShare(intent({ files: [{ ...photo, size: null }] }), 'share', () => 42);

  assert.equal(share?.content.files[0]?.size, 42);
});

test('a link goes as text, and a share with nothing in it is no share', () => {
  const link = 'https://example.com/article';

  assert.equal(
    receivedShare(intent({ webUrl: link, type: 'weburl' }), 's', () => 0)?.content.text,
    link,
  );
  assert.equal(
    receivedShare(intent({ text: '  ' }), 's', () => 0),
    null,
  );
});
