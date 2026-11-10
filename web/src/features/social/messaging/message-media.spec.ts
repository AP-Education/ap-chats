import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Attachment } from './attachments/types';
import { messageMedia } from './message-media.ts';
import type { ChatEntry } from './timeline/chat-entry';
import type { GifBlock } from './types';

function file(id: string, preview: Attachment['preview']): Attachment {
  return { id, name: id, size: 1, mediaType: '', preview, width: 4, height: 3, description: null };
}

const gif: GifBlock = {
  type: 'gif',
  provider: 'klipy',
  link: 'https://klipy.com/gifs/hello',
  title: 'Hello',
  media: { url: 'https://static.klipy.com/hello.webp', width: 1, height: 1 },
};

function message(
  id: string,
  attachments: Attachment[] = [],
  blocks: GifBlock[] = [],
  markdown: string | null = 'text',
): ChatEntry {
  return {
    kind: 'MESSAGE',
    payload: { item: { type: 'MESSAGE', id, message: { id, markdown, attachments, blocks } } },
  } as unknown as ChatEntry;
}

test('a message shows its photos and videos, then its GIF, never its documents', () => {
  const media = messageMedia(
    message('a', [file('p1', 'image'), file('doc', null), file('v1', 'video')], [gif]),
  );

  assert.deepEqual(
    media.map(({ key, kind }) => [key, kind]),
    [
      ['a:p1', 'image'],
      ['a:v1', 'video'],
      ['a:gif', 'gif'],
    ],
  );
});

test('a call shows no media', () => {
  assert.deepEqual(messageMedia({ kind: 'CALL' } as unknown as ChatEntry), []);
});

test('a caption is the message text, unless the text is only the GIF link', () => {
  const captions = [
    message('photo', [file('p1', 'image')], [], 'На пам’ять'),
    message('quiet', [file('p2', 'image')], [], ''),
    message('gif', [], [gif], gif.link),
  ].flatMap((entry) => messageMedia(entry).map((media) => media.caption));

  assert.deepEqual(captions, ['На пам’ять', undefined, undefined]);
});

test('a deleted message shows no media', () => {
  assert.deepEqual(messageMedia(message('gone', [file('p1', 'image')], [], null)), []);
});
