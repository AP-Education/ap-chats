import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MessageMarkdownService, messagePlainText } from './message-markdown';

const markdown = new MessageMarkdownService();

test('allows a blank caption only when the caller explicitly permits attachment content', async () => {
  await assert.rejects(markdown.normalize('   '));
  assert.deepEqual(await markdown.normalize('   ', true), {
    markdown: '',
    plainText: '',
    mentions: { memberIds: [], roleIds: [], everyone: false },
    links: [],
  });
});

test('stores canonical Markdown and derives structured mentions without persisting an AST', async () => {
  const source = 'Hello  **team**\r\n\r\n:member[123E4567-E89B-42D3-A456-426614174000]';
  const normalized = await markdown.normalize(source);

  assert.equal(
    normalized.markdown,
    'Hello  **team**\n\n:member[123e4567-e89b-42d3-a456-426614174000]',
  );
  assert.deepEqual(normalized.mentions.memberIds, ['123e4567-e89b-42d3-a456-426614174000']);
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
  assert.deepEqual(normalized.mentions, { memberIds: [], roleIds: [], everyone: false });
  assert.deepEqual(await markdown.normalize(normalized.markdown), normalized);
});

test('a blank message is still refused', async () => {
  await assert.rejects(markdown.normalize('   '));
  await assert.rejects(markdown.normalize('---'));
});

test('does not index text that only resembles a mention', async () => {
  const result = await markdown.normalize('`@Alex` and @Alex');
  assert.deepEqual(result.mentions, { memberIds: [], roleIds: [], everyone: false });
});

test('reads :mention[everyone] as a mention of the whole channel, but not inside code', async () => {
  const result = await markdown.normalize('Heads up :mention[everyone]');

  assert.equal(result.markdown, 'Heads up :mention[everyone]');
  assert.equal(result.plainText, 'Heads up @everyone\n');
  assert.deepEqual(result.mentions, { memberIds: [], roleIds: [], everyone: true });
  assert.equal((await markdown.normalize(':mention[Everyone]')).markdown, ':mention[everyone]');
  assert.equal(
    (await markdown.normalize(':mention[everyone]next')).markdown,
    ':mention[everyone]next',
  );
  assert.equal((await markdown.normalize('`:mention[everyone]`')).mentions.everyone, false);
  await readsAsText(':mention[team]');
});

test('reads :role[id] as a mention of everyone in that role', async () => {
  const result = await markdown.normalize('Ask :role[123E4567-E89B-42D3-A456-426614174000]');

  assert.equal(result.markdown, 'Ask :role[123e4567-e89b-42d3-a456-426614174000]');
  assert.deepEqual(result.mentions, {
    memberIds: [],
    roleIds: ['123e4567-e89b-42d3-a456-426614174000'],
    everyone: false,
  });
  await readsAsText(':role[design]');
});

test('keeps a channel link as markup without mentioning anyone', async () => {
  const result = await markdown.normalize('See :channel[123E4567-E89B-42D3-A456-426614174000]');

  assert.equal(result.markdown, 'See :channel[123e4567-e89b-42d3-a456-426614174000]');
  assert.deepEqual(result.mentions, { memberIds: [], roleIds: [], everyone: false });
  await readsAsText(':channel[general]');
});

test('stores an escaped colon so it parses back as text, not as a directive', async () => {
  const normalized = await markdown.normalize('Зустріч о 10\\:30, тема\\:бюджет');

  assert.equal(normalized.markdown, 'Зустріч о 10\\:30, тема\\:бюджет');
  assert.equal(normalized.plainText.trim(), 'Зустріч о 10:30, тема:бюджет');
  assert.deepEqual(await markdown.normalize(normalized.markdown), normalized);
});

test('keeps the text as typed, so a link with an underscore still opens', async () => {
  const source = 'see https://example.com/a_b?utm_source=chat and snake_case';
  const result = await markdown.normalize(source);

  assert.equal(result.markdown, source);
  assert.equal(result.plainText, `${source}\n`);
});

test('reads bare links as links, the way the client shows them', async () => {
  const result = await markdown.normalize(
    'gif https://klipy.com/gifs/hello-hi-662 and [docs](https://example.com) or ~~not~~ this',
  );

  assert.deepEqual(result.links, ['https://klipy.com/gifs/hello-hi-662', 'https://example.com']);
  assert.equal(result.markdown.includes('~~not~~'), true);
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

// A reference that points at nothing keeps its text and mentions no one.
async function readsAsText(source: string) {
  const normalized = await markdown.normalize(source);

  assert.equal(normalized.plainText.trim(), source);
  assert.deepEqual(normalized.mentions, { memberIds: [], roleIds: [], everyone: false });
}
