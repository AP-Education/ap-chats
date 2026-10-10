import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chipFaces, reactionsByPerson, reactionsLabel } from './reaction-display.ts';

const chip = (count: number, recentMemberIds: string[]) => ({
  emoji: '👍',
  count,
  recentMemberIds,
  reacted: false,
});
const directory = new Map([
  ['ann', 'Ann'],
  ['bob', 'Bob'],
]);

test('a chip shows faces while it has a few known people, and a number otherwise', () => {
  const find = (id: string) => directory.get(id);

  assert.deepEqual(chipFaces(chip(2, ['ann', 'bob']), find), ['Ann', 'Bob']);
  assert.equal(chipFaces(chip(4, ['ann', 'bob', 'cid']), find), null, 'too many people');
  assert.equal(chipFaces(chip(3, ['ann', 'bob']), find), null, 'not everyone listed');
  assert.equal(chipFaces(chip(2, ['ann', 'eve']), find), null, 'someone left the workspace');
});

test('people who reacted twice appear once, with both emoji', () => {
  const reactor = (memberId: string, emoji: string) => ({
    memberId,
    displayName: memberId,
    avatarPath: null,
    emoji,
  });

  const people = reactionsByPerson([
    reactor('ann', '👍'),
    reactor('bob', '🎉'),
    reactor('ann', '🎉'),
  ]);

  assert.deepEqual(
    people.map((person) => [person.name, person.emojis]),
    [
      ['ann', ['👍', '🎉']],
      ['bob', ['🎉']],
    ],
  );
});

test('the reaction total reads naturally in Ukrainian', () => {
  assert.deepEqual([1, 3, 7, 21].map(reactionsLabel), [
    '1 реакція',
    '3 реакції',
    '7 реакцій',
    '21 реакція',
  ]);
});
