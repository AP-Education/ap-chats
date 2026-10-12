import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fromAccessEntries, switchCapability, toAccessEntries } from './access-entries';

const everyone = { kind: 'everyone' } as const;
const hr = { kind: 'role', roleId: 'hr' } as const;
const maria = { kind: 'member', memberId: 'maria' } as const;

test('the three lists fold into the most each principal may do', () => {
  const entries = toAccessEntries({
    view: [everyone, hr],
    post: [hr],
    manage: [maria],
  });

  assert.deepEqual(entries, [
    { principal: everyone, level: 'view' },
    { principal: hr, level: 'post' },
    { principal: maria, level: 'manage' },
  ]);
});

test('entries go back as lists without repeating what a higher right implies', () => {
  assert.deepEqual(
    fromAccessEntries([
      { principal: everyone, level: 'view' },
      { principal: hr, level: 'post' },
    ]),
    { view: [everyone], post: [hr], manage: [] },
  );
});

test('turning a right on brings the lower ones, turning it off takes the higher ones', () => {
  assert.equal(switchCapability('view', 'manage', true), 'manage');
  assert.equal(switchCapability('manage', 'post', true), 'manage');
  assert.equal(switchCapability('manage', 'post', false), 'view');
  assert.equal(switchCapability('post', 'manage', false), 'post');
  assert.equal(switchCapability('post', 'view', false), null);
});
