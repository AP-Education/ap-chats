import assert from 'node:assert/strict';
import { test } from 'node:test';

import { gifBlock, type KlipyItem, toGif } from './klipy-items.ts';

const file = (name: string, width: number) => ({
  url: `https://static.klipy.com/ii/${name}`,
  width,
  height: width,
  size: 123_456,
});

test('a picked GIF carries only what a message keeps, not KLIPY extras such as size', () => {
  const item: KlipyItem = {
    slug: 'gm-goodmorning-18',
    title: 'Good morning',
    blur_preview: 'data:image/jpeg;base64,AAAA',
    file: {
      hd: { webp: file('hd.webp', 498) },
      md: { webp: file('md.webp', 300), gif: file('md.gif', 300) },
      sm: { webp: file('sm.webp', 220) },
      xs: { webp: file('xs.webp', 90) },
    },
  };

  assert.deepEqual(gifBlock(toGif(item)), {
    type: 'gif',
    provider: 'klipy',
    link: 'https://klipy.com/gifs/gm-goodmorning-18',
    title: 'Good morning',
    media: { url: 'https://static.klipy.com/ii/md.webp', width: 300, height: 300 },
  });
});
