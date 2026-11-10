import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AttachmentDraft } from '../../attachments/types';
import type { MessageAuthor, MessageHistoryItem } from '../../types';
import type { OutboxEntry } from '../types';
import { unsentRows } from './unsent-rows.ts';

const author: MessageAuthor = {
  memberId: 'me',
  displayName: 'Я',
  avatarPath: null,
  isBot: false,
  roleColor: null,
};

function entry(nonce: string, createdAt: string, extra: Partial<OutboxEntry> = {}): OutboxEntry {
  return { input: { markdown: nonce, clientNonce: nonce }, createdAt, status: 'sending', ...extra };
}

test('rows follow the order they were written and skip what history already holds', () => {
  const entries = [
    entry('late', '2026-10-18T10:02:00.000Z'),
    entry('landed', '2026-10-18T10:00:00.000Z'),
    entry('early', '2026-10-18T10:01:00.000Z'),
  ];

  const rows = unsentRows({ entries, files: new Map() }, new Set(['landed']), author, []);

  assert.deepEqual(
    rows.map((row) => row.entry.payload.item.id),
    ['early', 'late'],
  );
});

test('a row quotes the message it replies to and shows its files while they go up', () => {
  const target = { message: { id: 'target', markdown: 'Питання' } } as MessageHistoryItem;
  const files: AttachmentDraft[] = [
    { key: 'f', name: 'a.pdf', size: 1, status: 'uploading', progress: 40, description: '' },
  ];
  const reply = entry('a', '2026-10-18T10:00:00.000Z', {
    input: { markdown: 'Відповідь', clientNonce: 'a', replyToMessageId: 'target' },
    status: 'uploading',
    awaitsFiles: true,
  });

  const [row] = unsentRows(
    { entries: [reply], files: new Map([['a', files]]) },
    new Set(),
    author,
    [target],
  );

  assert.equal(row?.status, 'preparing');
  assert.equal(row?.entry.kind === 'MESSAGE' && row.entry.payload.pendingAttachments, files);
  assert.equal(row?.entry.kind === 'MESSAGE' && row.entry.payload.item.reply?.markdown, 'Питання');
});
