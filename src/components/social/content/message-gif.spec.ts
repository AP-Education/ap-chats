import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isLoneGif, keptGif, linkedGif, type MessageGif } from './message-gif';

const link = 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif';
const gif: MessageGif = {
  provider: 'giphy',
  link,
  title: 'GIF',
  media: { url: link, width: 480, height: 270 },
};

test('a GIF shows for the GIF link it was made from', () => {
  assert.equal(linkedGif(gif, ['https://example.com', link]), gif);
  assert.equal(linkedGif(undefined, [link]), null);
});

test('a GIF without its link in the text, or made for a link that is no GIF, is left out', () => {
  assert.equal(linkedGif(gif, ['https://klipy.com/gifs/another-one']), null);
  const other = { ...gif, link: 'https://example.com/page' };
  assert.equal(linkedGif(other, ['https://example.com/page']), null);
});

test('an edit keeps the GIF while its link stays, and drops it with the link', () => {
  assert.equal(keptGif(gif, [link]), gif);
  assert.equal(keptGif(gif, []), null);
  assert.equal(keptGif(null, [link]), null);
});

test('only a message that is nothing but its GIF link reads as a GIF', () => {
  assert.equal(isLoneGif(` ${link}\n`, gif), true);
  assert.equal(isLoneGif(`lol ${link}`, gif), false);
  // A GIF link the composer found no GIF for stays a link.
  assert.equal(isLoneGif(link, null), false);
});
