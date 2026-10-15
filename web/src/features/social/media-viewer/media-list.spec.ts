import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Attachment } from '../messaging/attachments/types';
import type { GifBlock, HistoryItem, MessageHistoryItem } from '../messaging/types';
import { conversationMedia } from './media-list.ts';

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
): MessageHistoryItem {
  return {
    type: 'MESSAGE',
    id,
    message: { id, markdown, attachments, blocks },
  } as unknown as MessageHistoryItem;
}

test('photos, videos and GIFs line up oldest first, each knowing its place in its message', () => {
  const items: HistoryItem[] = [
    message('a', [file('p1', 'image'), file('doc', null), file('v1', 'video')]),
    { type: 'CALL', id: 'call' } as unknown as HistoryItem,
    message('b', [], [gif]),
  ];

  const media = conversationMedia(items);

  assert.deepEqual(
    media.map(({ key, source, position }) => [key, source.kind, position.index, position.total]),
    [
      ['a:p1', 'image', 0, 2],
      ['a:v1', 'video', 1, 2],
      ['b:gif', 'gif', 0, 1],
    ],
  );
});

test('a caption is the message text, unless the text is only the GIF link', () => {
  const captions = conversationMedia([
    message('photo', [file('p1', 'image')], [], 'На пам’ять'),
    message('quiet', [file('p2', 'image')], [], ''),
    message('gif', [], [gif], gif.link),
  ]).map((media) => media.caption);

  assert.deepEqual(captions, ['На пам’ять', null, null]);
});

test('a deleted message shows no media', () => {
  assert.deepEqual(conversationMedia([message('gone', [file('p1', 'image')], [], null)]), []);
});
