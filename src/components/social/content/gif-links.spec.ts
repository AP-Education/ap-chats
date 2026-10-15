import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GIF_MEDIA, isGifLink, isLoneGifLink } from './gif-links';

test('GIF pages and GIF files on the services CDNs are GIF links', () => {
  assert.equal(isGifLink('https://klipy.com/gifs/angry-dan-levy'), true);
  assert.equal(isGifLink('https://giphy.com/gifs/happy-dance-l0HlBO7eyXzSZkJri'), true);
  assert.equal(isGifLink('https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif'), true);
  assert.equal(isGifLink('https://media1.tenor.com/m/abc/dance.gif'), true);
  assert.equal(
    isGifLink('https://media0.giphy.com/media/v1.Y2lk/l0HlBO7eyXzSZkJri/giphy.gif?cid=1&ct=g'),
    true,
  );
  assert.equal(isGifLink('https://example.com/tracker.gif'), false);
  assert.equal(isGifLink('http://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif'), false);
});

test('a GIF loads only from the services CDNs', () => {
  assert.equal(GIF_MEDIA.test('https://static.klipy.com/ii/hello.webp'), true);
  assert.equal(GIF_MEDIA.test('https://evil.test/hello.webp'), false);
});

test('only a message that is nothing but the link reads as a GIF', () => {
  assert.equal(isLoneGifLink(' https://klipy.com/gifs/angry-dan-levy\n'), true);
  assert.equal(isLoneGifLink('lol https://klipy.com/gifs/angry-dan-levy'), false);
});
