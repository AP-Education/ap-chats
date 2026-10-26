import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';

import { spoilerSyntax } from './spoiler-syntax.ts';

const render = (markdown: string) =>
  renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [spoilerSyntax] }, markdown));

test('text between a pair of marks hides, formatting and all', () => {
  assert.equal(
    render('AP LMS || 1.22.0 – 1.24.0 || Zoom'),
    '<p>AP LMS <span data-spoiler=""> 1.22.0 – 1.24.0 </span> Zoom</p>',
  );
  assert.equal(
    render('||**важливо** зараз||'),
    '<p><span data-spoiler=""><strong>важливо</strong> зараз</span></p>',
  );
});

test('a mark with no pair, a pair around nothing and marks in code read as typed', () => {
  assert.equal(render('a || b'), '<p>a || b</p>');
  assert.equal(render('|| ||'), '<p>|| ||</p>');
  assert.equal(render('`a||b||c`'), '<p><code>a||b||c</code></p>');
});
