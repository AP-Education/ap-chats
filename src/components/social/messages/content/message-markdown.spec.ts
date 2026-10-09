import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MessageMarkdownService, messagePlainText } from './message-markdown';

const markdown = new MessageMarkdownService();

test('allows a blank caption only when the caller explicitly permits attachment content', async () => {
  await assert.rejects(markdown.normalize('   '));
  assert.deepEqual(await markdown.normalize('   ', true), {
    markdown: '',
    plainText: '',
    mentions: { memberIds: [], everyone: false },
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

test('rejects executable links, unsupported syntax, and blank messages', async () => {
  await assert.rejects(markdown.normalize('[run](javascript:alert(1))'));
  await assert.rejects(markdown.normalize('![image](https://example.com/image.png)'));
  await assert.rejects(markdown.normalize('   '));
});

test('does not index text that only resembles a mention', async () => {
  const result = await markdown.normalize('`@Alex` and @Alex');
  assert.deepEqual(result.mentions, { memberIds: [], everyone: false });
});

test('reads :mention[everyone] as a mention of the whole channel, but not inside code', async () => {
  const result = await markdown.normalize('Heads up :mention[everyone]');

  assert.equal(result.markdown, 'Heads up :mention[everyone]');
  assert.equal(result.plainText, 'Heads up @everyone\n');
  assert.deepEqual(result.mentions, { memberIds: [], everyone: true });
  assert.equal(
    (await markdown.normalize(':mention[everyone]next')).markdown,
    ':mention[everyone]next',
  );
  assert.equal((await markdown.normalize('`:mention[everyone]`')).mentions.everyone, false);
  await assert.rejects(markdown.normalize(':mention[team]'));
});

test('keeps a channel link as markup without mentioning anyone', async () => {
  const result = await markdown.normalize('See :channel[123E4567-E89B-42D3-A456-426614174000]');

  assert.equal(result.markdown, 'See :channel[123e4567-e89b-42d3-a456-426614174000]');
  assert.deepEqual(result.mentions, { memberIds: [], everyone: false });
  await assert.rejects(markdown.normalize(':channel[general]'));
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
