import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitBareLinks } from './bare-links';

const link = (url: string, label = url) => ({
  type: 'link',
  url,
  children: [{ type: 'text', value: label }],
});

test('a bare url becomes a link, the sentence around it stays text', () => {
  assert.deepEqual(splitBareLinks('Дивись https://ap.education/docs?a=1, тут.'), [
    { type: 'text', value: 'Дивись ' },
    link('https://ap.education/docs?a=1'),
    { type: 'text', value: ', тут.' },
  ]);
});

test('www links open over https', () => {
  assert.deepEqual(splitBareLinks('www.example.com'), [
    link('https://www.example.com', 'www.example.com'),
  ]);
});

test('a parenthesis closes the link unless the link opened it', () => {
  assert.deepEqual(splitBareLinks('(https://en.wikipedia.org/wiki/Foo_(bar))'), [
    { type: 'text', value: '(' },
    link('https://en.wikipedia.org/wiki/Foo_(bar)'),
    { type: 'text', value: ')' },
  ]);
});

test('text without a link is left alone', () => {
  assert.deepEqual(splitBareLinks('just http:// text'), [
    { type: 'text', value: 'just http:// text' },
  ]);
});
