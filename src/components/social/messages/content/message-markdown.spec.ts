import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MessageMarkdownService, messagePlainText } from './message-markdown';

const markdown = new MessageMarkdownService();

test('allows a blank caption only when the caller explicitly permits attachment content', async () => {
  await assert.rejects(markdown.normalize('   '));
  assert.deepEqual(await markdown.normalize('   ', true), {
    markdown: '',
    plainText: '',
    mentionedMemberIds: [],
  });
});

test('stores canonical Markdown and derives structured mentions without persisting an AST', async () => {
  const source = 'Hello  **team**\r\n\r\n:member[123E4567-E89B-42D3-A456-426614174000]';
  const normalized = await markdown.normalize(source);

  assert.equal(
    normalized.markdown,
    'Hello  **team**\n\n:member[123e4567-e89b-42d3-a456-426614174000]',
  );
  assert.deepEqual(normalized.mentionedMemberIds, ['123e4567-e89b-42d3-a456-426614174000']);
  assert.deepEqual(await markdown.normalize(normalized.markdown), normalized);
});

test('formatting chat does not support is dropped and its text kept, not refused', async () => {
  const cases: [string, string][] = [
    ['# Підсумок\nтекст', 'Підсумок\n\nтекст'],
    ['до\n\n---\n\nпісля', 'до\n\nпісля'],
    ['![схема](https://example.com/a.png)', '[схема](https://example.com/a.png)'],
    ['[run](javascript:alert(1))', 'run'],
  ];

  for (const [source, expected] of cases) {
    const normalized = await markdown.normalize(source);
    assert.equal(normalized.markdown, expected);
    assert.deepEqual(await markdown.normalize(normalized.markdown), normalized);
  }
});

test('HTML and unknown directives read as the text they were typed as', async () => {
  const normalized = await markdown.normalize('<b>важливо</b> о 10:30, ::note');

  assert.equal(normalized.plainText.trim(), '<b>важливо</b> о 10:30, ::note');
  assert.deepEqual(normalized.mentionedMemberIds, []);
  assert.deepEqual(await markdown.normalize(normalized.markdown), normalized);
});

test('a blank message is still refused', async () => {
  await assert.rejects(markdown.normalize('   '));
  await assert.rejects(markdown.normalize('---'));
});

test('does not index text that only resembles a mention', async () => {
  const result = await markdown.normalize('`@Alex` and @Alex');
  assert.deepEqual(result.mentionedMemberIds, []);
});

test('stores an escaped colon so it parses back as text, not as a directive', async () => {
  const normalized = await markdown.normalize('Зустріч о 10\\:30, тема\\:бюджет');

  assert.equal(normalized.markdown, 'Зустріч о 10\\:30, тема\\:бюджет');
  assert.equal(normalized.plainText.trim(), 'Зустріч о 10:30, тема:бюджет');
  assert.deepEqual(await markdown.normalize(normalized.markdown), normalized);
});

test('preserves single and blank line breaks in stored Markdown', async () => {
  const result = await markdown.normalize('first\nsecond\n\nthird');
  assert.equal(result.markdown, 'first\nsecond\n\nthird');
});

test('notification text matches normalized content without rewriting stored Markdown', async () => {
  const content = await markdown.normalize(
    '**Team** [docs](https://example.com) `code`\n\n- first\n- second\n\n' +
      ':member[123e4567-e89b-42d3-a456-426614174000]',
  );

  assert.equal(await messagePlainText(content.markdown), content.plainText);
  assert.ok(content.markdown.includes('**Team**'));
  assert.ok(content.plainText.includes('@123e4567-e89b-42d3-a456-426614174000'));
  assert.equal(content.plainText.includes('https://example.com'), false);
});
