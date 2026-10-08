import assert from 'node:assert/strict';
import { test } from 'node:test';

import { avatarInitials } from './initials';

test('takes the first and last name letters', () => {
  assert.equal(avatarInitials('Олена Коваль'), 'ОК');
  assert.equal(avatarInitials('Олександр Петрович Гордійчук'), 'ОГ');
});

test('keeps a single word to one letter', () => {
  assert.equal(avatarInitials('Колега'), 'К');
});

test('keeps a leading acronym whole', () => {
  assert.equal(avatarInitials('AP Education'), 'AP');
  assert.equal(avatarInitials('AP Admin'), 'AP');
});

test('skips punctuation and falls back for empty names', () => {
  assert.equal(avatarInitials('  @олена   (коваль) '), 'ОК');
  assert.equal(avatarInitials('   '), '?');
});
