import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';

import { mentionDirective } from './mention-directive.ts';

const render = (markdown: string) =>
  renderToStaticMarkup(
    createElement(ReactMarkdown, { remarkPlugins: [remarkDirective, mentionDirective] }, markdown),
  );

test('a directive that names no reference reads as typed, as text is stored that way', () => {
  assert.equal(render('о 10:30, Note:This :foo[bar]'), '<p>о 10:30, Note:This :foo[bar]</p>');
  assert.equal(render('::note'), '<p>::note</p>');
});

test('a reference renders as one, unless it carries attributes the server does not take', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';

  assert.equal(
    render(`hi :member[${id}]`),
    `<p>hi <span data-mention="member" data-mention-id="${id}">${id}</span></p>`,
  );
  assert.equal(render(`:member[${id}]{x=1}`), `<p>:member[${id}]{x=1}</p>`);
});
