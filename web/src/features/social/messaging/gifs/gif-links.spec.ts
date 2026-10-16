import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { GifBlock } from '../types.ts';
import { firstGifLink, isLoneGif, readGifLink } from './gif-links.ts';

test('a KLIPY page is looked up by its slug', () => {
  assert.deepEqual(readGifLink('https://klipy.com/gifs/angry-dan-levy'), {
    kind: 'klipy',
    slug: 'angry-dan-levy',
  });
  assert.equal(readGifLink('https://klipy.com/stickers/angry-dan-levy'), null);
});

test('a GIPHY page shows its file, whatever the slug before the id', () => {
  const file = {
    kind: 'file',
    provider: 'giphy',
    url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.webp',
  };

  assert.deepEqual(readGifLink('https://giphy.com/gifs/happy-dance-l0HlBO7eyXzSZkJri'), file);
  assert.deepEqual(readGifLink('https://www.giphy.com/gifs/l0HlBO7eyXzSZkJri'), file);
});

test('GIF files on the services CDNs show as they are, query and all', () => {
  const giphy = 'https://media0.giphy.com/media/v1.Y2lk/l0HlBO7eyXzSZkJri/giphy.gif?cid=1&ct=g';

  assert.deepEqual(readGifLink(giphy), { kind: 'file', provider: 'giphy', url: giphy });
  assert.equal(readGifLink('https://media1.tenor.com/m/abc/dance.gif')?.kind, 'file');
  assert.equal(readGifLink('https://example.com/tracker.gif'), null);
  assert.equal(readGifLink('https://media.tenor.com/abc/clip.mp4'), null);
});

test('a message shows the first GIF link it makes, without the closing punctuation', () => {
  assert.equal(
    firstGifLink('so true (https://klipy.com/gifs/angry-dan-levy). also https://klipy.com/gifs/b'),
    'https://klipy.com/gifs/angry-dan-levy',
  );
});

test('links in code, in angle brackets, or to other sites show no GIF', () => {
  assert.equal(firstGifLink('`https://klipy.com/gifs/angry-dan-levy`'), null);
  assert.equal(firstGifLink('```\nhttps://klipy.com/gifs/angry-dan-levy\n```'), null);
  assert.equal(firstGifLink('<https://klipy.com/gifs/angry-dan-levy>'), null);
  assert.equal(firstGifLink('docs at https://example.com/guide'), null);
});

test('only a message that is nothing but its GIF link reads as a GIF', () => {
  const link = 'https://klipy.com/gifs/angry-dan-levy';
  const blocks: GifBlock[] = [
    {
      type: 'gif',
      provider: 'klipy',
      link,
      title: 'GIF',
      media: { url: 'https://static.klipy.com/ii/a.webp', width: 1, height: 1 },
    },
  ];

  assert.equal(isLoneGif({ markdown: ` ${link}\n`, blocks }), true);
  assert.equal(isLoneGif({ markdown: `lol ${link}`, blocks }), false);
  // A GIF link the composer found no GIF for stays a link.
  assert.equal(isLoneGif({ markdown: link, blocks: [] }), false);
  assert.equal(isLoneGif({ markdown: null, blocks }), false);
});
