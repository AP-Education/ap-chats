import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Gif } from '../../../gifs/types';
import { gifColumns } from './gif-columns.ts';

function gif(slug: string, width: number, height: number): Gif {
  const image = { url: `https://static.klipy.com/${slug}.webp`, width, height };
  return { slug, title: slug, pageUrl: '', preview: image, image, placeholder: null };
}

test('each GIF goes to the shortest column, so tall and wide ones even out', () => {
  const tall = gif('tall', 100, 200);
  const wide = gif('wide', 200, 100);
  const square = gif('square', 100, 100);
  const next = gif('next', 100, 100);
  const last = gif('last', 100, 100);

  const columns = gifColumns([tall, wide, square, next, last], 2);

  assert.deepEqual(
    columns.map((column) => column.map(({ slug }) => slug)),
    [
      ['tall', 'last'],
      ['wide', 'square', 'next'],
    ],
  );
});

test('the first GIFs open the columns in their own order', () => {
  const columns = gifColumns([gif('a', 1, 1), gif('b', 1, 1), gif('c', 1, 1)], 2);

  assert.deepEqual(
    columns.map((column) => column.map(({ slug }) => slug)),
    [['a', 'c'], ['b']],
  );
});
