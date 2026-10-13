import assert from 'node:assert/strict';
import { test } from 'node:test';

import { moveRole } from './role-order';

test('a role dropped on another takes its place in either direction', () => {
  const roles = ['leads', 'design', 'hr', 'sales'];

  assert.deepEqual(moveRole(roles, 'sales', 'design'), ['leads', 'sales', 'design', 'hr']);
  assert.deepEqual(moveRole(roles, 'leads', 'hr'), ['design', 'hr', 'leads', 'sales']);
});

test('dropping on itself or on an unknown role keeps the order', () => {
  const roles = ['leads', 'design'];

  assert.equal(moveRole(roles, 'leads', 'leads'), roles);
  assert.equal(moveRole(roles, 'leads', 'gone'), roles);
});
