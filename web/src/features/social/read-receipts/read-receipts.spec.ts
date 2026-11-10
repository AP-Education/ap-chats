import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ChatTimelineData } from '../messaging/timeline/chat-entry.ts';
import { isReadByPeer, withPeerRead } from './read-receipts.ts';

function history(peerReadSeq: string | null): ChatTimelineData {
  return {
    entries: [],
    hasOlder: false,
    hasNewer: false,
    firstUnread: null,
    known: '20',
    meta: { readState: null, peerReadSeq, unreadCount: 0 },
  };
}

test('a newer receipt moves the mark on, compared as numbers', () => {
  assert.equal(withPeerRead(history('9'), '10').meta?.peerReadSeq, '10');
});

test('a late, older receipt changes nothing', () => {
  const window = history('7');
  assert.equal(withPeerRead(window, '5'), window);
});

test('a conversation without read receipts never gains them', () => {
  assert.equal(withPeerRead(history(null), '5').meta?.peerReadSeq, null);
});

test('a message is read once the receipt reaches it', () => {
  assert.equal(isReadByPeer('10', '10'), true);
  assert.equal(isReadByPeer('9', '10'), true);
  assert.equal(isReadByPeer('11', '10'), false);
  assert.equal(isReadByPeer('1', null), false);
});
