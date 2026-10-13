import assert from 'node:assert/strict';
import { test } from 'node:test';

import { reachesViewer, type ViewerReach } from './mention-reach';

const me = 'aaaaaaaa-0000-4000-8000-000000000001';
const design = 'bbbbbbbb-0000-4000-8000-000000000001';
const sales = 'bbbbbbbb-0000-4000-8000-000000000002';

const reach = (overrides: Partial<ViewerReach> = {}): ViewerReach => ({
  memberId: me,
  mentioned: true,
  roleIds: [design],
  ...overrides,
});

test('a tag reads as mine only when that reference reached me', () => {
  assert.equal(reachesViewer({ kind: 'member', id: me }, reach()), true);
  assert.equal(reachesViewer({ kind: 'member', id: design }, reach()), false);
  assert.equal(reachesViewer({ kind: 'role', id: design }, reach()), true);
  assert.equal(reachesViewer({ kind: 'role', id: sales }, reach()), false);
  assert.equal(reachesViewer({ kind: 'everyone' }, reach()), true);
  assert.equal(reachesViewer({ kind: 'channel', id: design }, reach()), false);
});

test('a role I joined after the message, or @everyone in my own message, is not mine', () => {
  const unreached = reach({ mentioned: false, roleIds: [] });

  assert.equal(reachesViewer({ kind: 'role', id: design }, unreached), false);
  assert.equal(reachesViewer({ kind: 'everyone' }, unreached), false);
  assert.equal(reachesViewer({ kind: 'member', id: me }, undefined), false);
});
