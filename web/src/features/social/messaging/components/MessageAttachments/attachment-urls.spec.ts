import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import { QueryClient } from '@tanstack/react-query';

import type { AttachmentLinks, MessageAttachment } from '../../attachments/types';
import { attachmentMedia } from '../../message-media';
import { type AttachmentUrlQueryOf, attachmentUrls, freshFor } from './attachment-urls';

/** A conversation's media addresses over an API whose every signed address is new. */
function conversationUrls(t: TestContext) {
  const queryClient = new QueryClient();
  t.after(() => queryClient.clear());
  const asked: string[] = [];
  const queryOf: AttachmentUrlQueryOf = ({ attachmentId }, variant) => ({
    queryKey: ['attachment-url', attachmentId, variant],
    queryFn: async () => {
      asked.push(`${attachmentId}:${variant}`);
      return { url: `https://storage.test/signed-${asked.length}` };
    },
    staleTime: freshFor(variant),
  });
  return { urls: attachmentUrls(queryClient, queryOf), asked };
}

function file(id: string, preview: MessageAttachment['preview'], links?: AttachmentLinks) {
  const attachment: MessageAttachment = {
    id,
    name: `${id}.bin`,
    size: 1,
    mediaType: 'application/octet-stream',
    preview,
    width: 4,
    height: 3,
    description: null,
    links,
  };
  return attachmentMedia('message', attachment);
}

const photoLinks = {
  thumbnail: 'https://storage.test/photo-small',
  preview: 'https://storage.test/photo',
};

test('a photo shows at once by the links its message brought, asking the API nothing', (t) => {
  const { urls, asked } = conversationUrls(t);
  const photo = file('photo', 'image', photoLinks);

  assert.equal(urls.cached(photo, 'thumbnail'), photoLinks.thumbnail);
  assert.equal(urls.cached(photo, 'preview'), photoLinks.preview);
  assert.deepEqual(asked, []);
});

test('a photo whose link lapsed is asked for again, signed afresh each time', async (t) => {
  const { urls, asked } = conversationUrls(t);
  const photo = file('photo', 'image', photoLinks);

  const first = await urls.fetch(photo, 'thumbnail');
  const second = await urls.fetch(photo, 'thumbnail');

  assert.notEqual(second, first);
  assert.deepEqual(asked, ['photo:thumbnail', 'photo:thumbnail']);
});

test('a video plays and a file saves only once asked for', async (t) => {
  const { urls, asked } = conversationUrls(t);
  const video = file('video', 'video', {});
  const photo = file('photo', 'image', photoLinks);

  assert.equal(urls.cached(video, 'preview'), undefined);
  assert.equal(urls.cached(photo, 'download'), undefined);

  await urls.fetch(photo, 'download');
  assert.deepEqual(asked, ['photo:download']);
});
