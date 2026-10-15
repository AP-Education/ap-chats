import assert from 'node:assert/strict';
import { test } from 'node:test';

import { principalFromKey, principalKey, toPermissionsInput } from './principals';

test('every kind of principal survives the round trip through its select key', () => {
  for (const principal of [
    { kind: 'everyone' } as const,
    { kind: 'role', roleId: 'design' } as const,
    { kind: 'member', memberId: 'olena' } as const,
  ])
    assert.deepEqual(principalFromKey(principalKey(principal)), principal);
});

test('described lists become an editable value without display details', () => {
  const input = toPermissionsInput({
    view: [{ kind: 'everyone' }],
    post: [{ kind: 'role', roleId: 'hr', name: 'HR', color: '#22aa66' }],
    manage: [{ kind: 'member', memberId: 'maria', displayName: 'Maria', avatarPath: null }],
  });

  assert.deepEqual(input, {
    view: [{ kind: 'everyone' }],
    post: [{ kind: 'role', roleId: 'hr' }],
    manage: [{ kind: 'member', memberId: 'maria' }],
  });
});
