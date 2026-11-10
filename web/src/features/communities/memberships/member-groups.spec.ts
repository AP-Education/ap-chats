import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Role } from '@/features/roles/types';

import { i18n, i18nReady } from '../../../shared/i18n/i18n';
import { groupMembersByRole } from './member-groups';
import type { ChannelMembership } from './types';

const role = (id: string, position: number, isHoisted: boolean): Role => ({
  id,
  workspaceId: 'office',
  name: id,
  color: null,
  position,
  isHoisted,
  memberCount: 0,
  createdAt: '',
  updatedAt: '',
});

const member = (memberId: string, hoistedRoleId: string | null): ChannelMembership => ({
  workspaceId: 'office',
  channelId: 'general',
  memberId,
  joinedAt: '',
  hoistedRoleId,
  roleColor: null,
});

await i18nReady('uk');
const t = i18n.getFixedT('uk', 'communities');

test('hoisted roles become groups in role order, everyone else follows', () => {
  const groups = groupMembersByRole(
    [member('olena', 'design'), member('maria', 'leads'), member('ihor', null)],
    [role('leads', 0, true), role('design', 1, true), role('sales', 2, true)],
    (memberId) => memberId,
    t,
  );

  assert.deepEqual(
    groups.map((group) => [group.title, group.members.map((entry) => entry.memberId)]),
    [
      ['leads', ['maria']],
      ['design', ['olena']],
      ['Учасники', ['ihor']],
    ],
  );
});

test('a role no longer hoisted puts its people back among everyone', () => {
  const groups = groupMembersByRole(
    [member('olena', 'design')],
    [role('design', 0, false)],
    (memberId) => memberId,
    t,
  );

  assert.deepEqual(
    groups.map((group) => group.key),
    ['members'],
  );
});

test('people within a group are listed by name as a Ukrainian reader orders them', () => {
  const names = new Map([
    ['a', 'Ярослав'],
    ['b', 'Ірина'],
    ['c', 'Андрій'],
    ['d', 'Євген'],
  ]);
  const groups = groupMembersByRole(
    [member('a', null), member('b', null), member('c', null), member('d', null)],
    [],
    (memberId) => names.get(memberId) ?? '',
    t,
  );

  assert.deepEqual(
    groups[0]?.members.map((entry) => names.get(entry.memberId)),
    ['Андрій', 'Євген', 'Ірина', 'Ярослав'],
  );
});
