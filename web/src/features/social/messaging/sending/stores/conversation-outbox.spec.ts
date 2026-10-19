import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AttachmentDraft } from '../../attachments/types';
import type { Message, SendMessageCommand } from '../../types';
import type { OutboxEntry, OutboxUploads } from '../types';
import { ConversationOutbox } from './conversation-outbox.ts';

function draft(key: string, status: AttachmentDraft['status']): AttachmentDraft {
  return {
    key,
    name: `${key}.pdf`,
    size: 10,
    status,
    progress: 0,
    description: '',
    ...(status === 'ready'
      ? {
          attachment: {
            id: key,
            name: `${key}.pdf`,
            size: 10,
            mediaType: 'application/pdf',
            preview: null,
            width: null,
            height: null,
            description: null,
          },
        }
      : {}),
  };
}

class FakeUploads implements OutboxUploads {
  committed = new Map<string, AttachmentDraft[]>();
  removed: string[] = [];
  retried: string[] = [];
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getCommitted = (nonce: string) => this.committed.get(nonce) ?? [];
  releaseCommitted = (nonce: string) => {
    this.committed.delete(nonce);
    this.emit();
  };
  remove = (key: string) => {
    this.removed.push(key);
    for (const [nonce, drafts] of this.committed) {
      this.committed.set(
        nonce,
        drafts.filter((entry) => entry.key !== key),
      );
    }
    this.emit();
  };
  retry = (key: string) => {
    this.retried.push(key);
  };

  set(nonce: string, drafts: AttachmentDraft[]) {
    this.committed.set(nonce, drafts);
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

function message(input: SendMessageCommand): Message {
  return {
    id: `id-${input.clientNonce}`,
    seq: '1',
    authorMemberId: 'me',
    clientNonce: input.clientNonce,
    markdown: input.markdown,
    attachments: input.attachments,
    contentVersion: 1,
    revision: 1,
    replyToMessageId: null,
    quoteText: null,
    isForwarded: false,
    forwardedFromMemberId: null,
    createdAt: '2026-10-17T10:00:00.000Z',
    editedAt: null,
    deletedAt: null,
  };
}

function setup({ stored = [] as unknown, post = 'resolve' as 'resolve' | 'reject' | 'hang' } = {}) {
  const uploads = new FakeUploads();
  const posted: SendMessageCommand[] = [];
  const signals: AbortSignal[] = [];
  let written: readonly OutboxEntry[] = [];
  const outbox = new ConversationOutbox({
    uploads,
    storage: { read: () => stored, write: (entries) => (written = entries) },
    post: (input, signal) => {
      posted.push(input);
      signals.push(signal);
      if (post === 'reject') return Promise.reject(new Error('offline'));
      if (post === 'hang') return new Promise(() => {});
      return Promise.resolve(message(input));
    },
    recordSent: async () => {},
  });
  const statuses = () => outbox.getSnapshot().entries.map((entry) => entry.status);
  return { outbox, uploads, posted, signals, statuses, written: () => written };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a text message posts at once and leaves the outbox once the server has it', async () => {
  const { outbox, posted, statuses } = setup();

  const landed = outbox.send({ markdown: 'Привіт' }, 'a');
  assert.deepEqual(statuses(), ['sending']);

  assert.equal((await landed).clientNonce, 'a');
  await settle();
  assert.deepEqual(statuses(), []);
  assert.equal(posted.length, 1);
});

test('a message with files waits for all of them, then posts them as its attachments', async () => {
  const { outbox, uploads, posted, statuses } = setup();
  uploads.set('a', [draft('one', 'uploading'), draft('two', 'ready')]);

  void outbox.send({ markdown: '' }, 'a');
  assert.deepEqual(statuses(), ['uploading']);
  assert.equal(outbox.getSnapshot().files.get('a')?.length, 2);
  assert.equal(posted.length, 0);

  uploads.set('a', [draft('one', 'ready'), draft('two', 'ready')]);
  assert.deepEqual(
    posted.map((input) => input.attachments?.map((file) => file.id)),
    [['one', 'two']],
  );
});

test('two messages finishing in the same notification are each posted once', () => {
  const { outbox, uploads, posted } = setup();
  uploads.committed.set('a', [draft('one', 'uploading')]);
  uploads.committed.set('b', [draft('two', 'uploading')]);
  void outbox.send({ markdown: 'a' }, 'a');
  void outbox.send({ markdown: 'b' }, 'b');

  uploads.committed.set('a', [draft('one', 'ready')]);
  uploads.set('b', [draft('two', 'ready')]);

  assert.deepEqual(posted.map((input) => input.clientNonce).sort(), ['a', 'b']);
});

test('a failed upload stops the message, and a retry sends its failed files again', () => {
  const { outbox, uploads, statuses } = setup();
  uploads.set('a', [draft('one', 'uploading')]);
  void outbox.send({ markdown: 'Звіт' }, 'a');

  uploads.set('a', [draft('one', 'error')]);
  assert.deepEqual(statuses(), ['failed']);

  outbox.retry('a');
  assert.deepEqual(statuses(), ['uploading']);
  assert.deepEqual(uploads.retried, ['one']);
});

test('withdrawing a message still uploading stops its files and drops it', () => {
  const { outbox, uploads, posted, statuses } = setup();
  uploads.set('a', [draft('one', 'uploading'), draft('two', 'queued')]);
  void outbox.send({ markdown: '' }, 'a');

  outbox.cancel('a');

  assert.deepEqual(statuses(), []);
  assert.deepEqual(uploads.removed, ['one', 'two']);
  assert.equal(posted.length, 0);
});

test('withdrawing a message on its way aborts its request', () => {
  const { outbox, signals, statuses } = setup({ post: 'hang' });
  void outbox.send({ markdown: 'Привіт' }, 'a');

  outbox.cancel('a');

  assert.equal(signals[0]?.aborted, true);
  assert.deepEqual(statuses(), []);
});

test('taking out the last file posts the text alone, or drops a message that had only files', () => {
  const { outbox, uploads, posted, statuses } = setup();
  uploads.set('a', [draft('one', 'uploading')]);
  uploads.set('b', [draft('two', 'uploading')]);
  void outbox.send({ markdown: 'Підпис' }, 'a');
  void outbox.send({ markdown: '' }, 'b');

  outbox.cancelFile('a', 'one');
  outbox.cancelFile('b', 'two');

  assert.deepEqual(
    posted.map((input) => [input.clientNonce, input.attachments]),
    [['a', undefined]],
  );
  assert.deepEqual(statuses(), ['sending']);
});

test('a failed post waits for a retry, and only messages without pending files are stored', async () => {
  const { outbox, uploads, statuses, written } = setup({ post: 'reject' });
  uploads.set('b', [draft('one', 'uploading')]);
  void outbox.send({ markdown: 'a' }, 'a');
  void outbox.send({ markdown: 'b' }, 'b');
  await settle();

  assert.deepEqual(statuses(), ['failed', 'uploading']);
  assert.deepEqual(
    written().map((entry) => entry.input.clientNonce),
    ['a'],
  );
});

test('entries history already holds are let go', () => {
  const stored = [{ input: { markdown: 'a', clientNonce: 'a' }, createdAt: 'x', status: 'failed' }];
  const { outbox, statuses } = setup({ stored });
  assert.deepEqual(statuses(), ['failed']);

  outbox.forget(new Set(['a']));

  assert.deepEqual(statuses(), []);
});
