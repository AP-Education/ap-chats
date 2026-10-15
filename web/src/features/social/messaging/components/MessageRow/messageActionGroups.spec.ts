import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ActionAccent, ConversationAction } from '@/features/social/messaging/types';

import { groupMessageActions } from './messageActionGroups.ts';

function action(id: string, accent?: ActionAccent): ConversationAction {
  return { id, accent, icon: null, label: () => id, available: () => true, execute: () => {} };
}

function ids(groups: ConversationAction[][]) {
  return groups.map((group) => group.map(({ id }) => id));
}

test('an assistant action stands on its own just above delete', () => {
  const groups = groupMessageActions([
    action('reply'),
    action('delete', 'danger'),
    action('ask-star-me', 'ai'),
    action('copy'),
  ]);

  assert.deepEqual(ids(groups), [['reply'], ['copy'], ['ask-star-me'], ['delete']]);
});

test('an unknown plain action sits just before delete', () => {
  const groups = groupMessageActions([
    action('delete', 'danger'),
    action('translate'),
    action('pin'),
  ]);

  assert.deepEqual(ids(groups), [['pin'], ['translate'], ['delete']]);
});
