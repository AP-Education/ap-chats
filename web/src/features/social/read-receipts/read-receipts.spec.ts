import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HistoryPage } from '../messaging/types.ts';
import { isReadByPeer, peerReadSeqOf, withPeerRead } from './read-receipts.ts';

function page(peerReadSeq: string | null): HistoryPage {
  return {
    items: [],
    snapshotSeq: '20',
    firstUnreadSeq: null,
    unreadCount: 0,
    hasOlder: false,
    olderCursor: null,
    hasNewer: false,
    newerCursor: null,
    readState: null,
    peerReadSeq,
  };
}

function history(...pages: HistoryPage[]) {
  return { pages, pageParams: pages.map(() => ({ mode: 'window' as const })) };
}

test('the furthest receipt among loaded pages wins, compared as numbers', () => {
  assert.equal(peerReadSeqOf([page('9'), page('10'), page('2')]), '10');
});

test('a conversation without read receipts has no receipt to show', () => {
  assert.equal(peerReadSeqOf([page(null), page(null)]), null);
  assert.equal(peerReadSeqOf([]), null);
});

test('a newer receipt moves every page on', () => {
  const moved = withPeerRead(history(page('3'), page('5')), '7');
  assert.deepEqual(
    moved.pages.map((entry) => entry.peerReadSeq),
    ['7', '7'],
  );
});

test('a late, older receipt changes nothing', () => {
  const moved = withPeerRead(history(page('7')), '5');
  assert.equal(moved.pages[0]?.peerReadSeq, '7');
});

test('a page without read receipts never gains them', () => {
  const moved = withPeerRead(history(page(null)), '5');
  assert.equal(moved.pages[0]?.peerReadSeq, null);
});

test('a message is read once the receipt reaches it', () => {
  assert.equal(isReadByPeer('10', '10'), true);
  assert.equal(isReadByPeer('9', '10'), true);
  assert.equal(isReadByPeer('11', '10'), false);
  assert.equal(isReadByPeer('1', null), false);
});
