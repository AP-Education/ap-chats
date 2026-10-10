import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyReactionChange, toggledReaction } from './reaction-cache.ts';

const reactions = [
  { emoji: '🎉', count: 1, recentMemberIds: ['ann'], reacted: false },
  { emoji: '👍', count: 2, recentMemberIds: ['me', 'bob'], reacted: true },
];

test('a first reaction adds its chip after the others', () => {
  const change = { emoji: '🔥', count: 1, recentMemberIds: ['me'], reacted: true };
  assert.deepEqual(applyReactionChange(reactions, change), [...reactions, change]);
});

test('a chip keeps its place and the viewer mark when someone else reacts', () => {
  const change = { emoji: '👍', count: 3, recentMemberIds: ['ann', 'me', 'bob'] };
  assert.deepEqual(applyReactionChange(reactions, change), [
    reactions[0],
    { ...change, reacted: true },
  ]);
});

test('the last reaction removes the chip', () => {
  const change = { emoji: '🎉', count: 0, recentMemberIds: [] };
  assert.deepEqual(applyReactionChange(reactions, change), [reactions[1]]);
});

test('a repeated change lands on the same state', () => {
  const change = { emoji: '👍', count: 1, recentMemberIds: ['bob'], reacted: false };
  const once = applyReactionChange(reactions, change);
  assert.deepEqual(applyReactionChange(once, change), once);
});

test('the viewer joins the faces first and leaves them on undo', () => {
  assert.deepEqual(toggledReaction(reactions[0], '🎉', 'me'), {
    emoji: '🎉',
    count: 2,
    recentMemberIds: ['me', 'ann'],
    reacted: true,
  });
  assert.deepEqual(toggledReaction(reactions[1], '👍', 'me'), {
    emoji: '👍',
    count: 1,
    recentMemberIds: ['bob'],
    reacted: false,
  });
});
