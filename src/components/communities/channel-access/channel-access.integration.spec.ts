import assert from 'node:assert/strict';
import { test } from 'node:test';

import { and, eq } from 'drizzle-orm';

import type { Principal } from '@/components/workspaces/access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import * as schema from '@/database/drizzle/schema';
import { channelAccessOnPostgres } from '@/testing/channel-access';
import { seedConversations } from '@/testing/conversations';
import { migratedDatabase } from '@/testing/pglite';

import type { ChannelPermissions } from './permissions/types';
import {
  CHANNEL_ACCESS_CHANGED_EVENT,
  type ChannelAccessChangedEvent,
} from './sync/channel-access-changed.event';

const everyone: Principal = { kind: 'everyone' };
const role = (roleId: string): Principal => ({ kind: 'role', roleId });
const person = (member: WorkspaceMember): Principal => ({ kind: 'member', memberId: member.id });

test('channel access on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const { events, people, roles, roleMembers, directory, permissions, memberships, policy } =
    channelAccessOnPostgres(db);
  const lastAccessChange = () =>
    events.lastOf<ChannelAccessChangedEvent>(CHANNEL_ACCESS_CHANGED_EVENT)?.changes;
  const seed = seedConversations(db);

  async function office() {
    const workspaceId = await seed.workspace();
    const join = async (name: string, level?: WorkspaceMember['accessLevel']) =>
      seed.join(workspaceId, await seed.person(name), level);

    const owner = await join('Maria', 'owner');
    const manager = await join('Andrii', 'manager');
    const designer = await join('Olena');
    const recruiter = await join('Ihor');

    const open = (name: string, lists: Partial<ChannelPermissions>, by = owner) =>
      directory.create(by, {
        name,
        permissions: { view: [], post: [], manage: [], ...lists } as never,
      });
    const sees = async (member: WorkspaceMember) =>
      (await directory.list(member, 'mine')).map((channel) => channel.name);

    return { owner, manager, designer, recruiter, open, sees };
  }

  await t.test('an open channel reaches everyone without joining', async () => {
    const { owner, designer, recruiter, open, sees } = await office();

    const general = await open('general', { view: [everyone], post: [everyone] });

    assert.equal(general.isOpen, true);
    for (const member of [owner, designer, recruiter])
      assert.deepEqual(await sees(member), ['general']);
    const [seenByDesigner] = await directory.list(designer, 'mine');
    assert.equal(seenByDesigner?.canPost, true);
    assert.equal(seenByDesigner?.canManage, false);
  });

  await t.test('the person who opens a channel runs it', async () => {
    const { designer, manager, open } = await office();

    const ideas = await open('ideas', { view: [person(designer)] }, manager);

    assert.equal(ideas.isMember, true);
    assert.equal(ideas.canManage, true);
  });

  await t.test('a role brings its people in and takes them out', async () => {
    const { owner, manager, designer, open, sees } = await office();
    const design = await roles.create(owner, { name: 'Design' });
    const channel = await open('design', { post: [role(design.id)] });

    await roleMembers.add(manager, design.id, [designer.id]);
    assert.deepEqual(await sees(designer), ['design']);
    assert.deepEqual(lastAccessChange()?.granted, [
      { channelId: channel.id, memberId: designer.id },
    ]);

    await roleMembers.remove(manager, design.id, designer.id);
    assert.deepEqual(await sees(designer), []);
    assert.deepEqual(lastAccessChange()?.revoked, [
      { channelId: channel.id, memberId: designer.id },
    ]);
  });

  await t.test('a newcomer sees the history but none of it as unread', async () => {
    const { owner, designer, open } = await office();
    const design = await roles.create(owner, { name: 'Design' });
    const channel = await open('design', { post: [role(design.id)] });
    await db
      .update(schema.channels)
      .set({ lastEntrySeq: 42n })
      .where(eq(schema.channels.id, channel.id));

    await roleMembers.add(owner, design.id, [designer.id]);

    const [membership] = await db
      .select({ lastRead: schema.channelMemberships.lastReadEntrySeq })
      .from(schema.channelMemberships)
      .where(
        and(
          eq(schema.channelMemberships.channelId, channel.id),
          eq(schema.channelMemberships.memberId, designer.id),
        ),
      );
    assert.equal(membership?.lastRead, 42n);
  });

  await t.test('announcements are read by everyone and written by one role', async () => {
    const { owner, designer, recruiter, open } = await office();
    const hr = await roles.create(owner, { name: 'HR' });
    await roleMembers.add(owner, hr.id, [recruiter.id]);
    const announcements = await open('announcements', { view: [everyone], post: [role(hr.id)] });

    await policy.requireViewAccess(designer, announcements.id);
    await policy.requireReactAccess(designer, announcements.id);
    await assert.rejects(policy.requirePostAccess(designer, announcements.id), { status: 403 });
    await policy.requirePostAccess(recruiter, announcements.id);
  });

  await t.test('workspace managers run every channel without reading it', async () => {
    const { owner, manager, designer, open, sees } = await office();
    const hr = await roles.create(owner, { name: 'HR' });
    const cases = await open('hr-cases', { post: [role(hr.id)] });

    const [listed] = await directory.list(manager, 'all');

    assert.deepEqual(await sees(manager), []);
    assert.equal(listed?.isMember, false);
    assert.equal(listed?.canManage, true);
    assert.deepEqual((await permissions.describe(manager, cases.id)).post, [
      { kind: 'role', roleId: hr.id, name: 'HR', color: null },
    ]);
    await assert.rejects(policy.requireViewAccess(manager, cases.id), { status: 404 });
    await assert.rejects(directory.list(designer, 'all'), { status: 403 });
  });

  await t.test('only the channel managers change who has access', async () => {
    const { owner, designer, recruiter, open, sees } = await office();
    const project = await open('project', { post: [person(designer)] });
    const withRecruiter = {
      view: [],
      post: [person(designer), person(recruiter)],
      manage: [],
    };

    await assert.rejects(permissions.change(designer, project.id, withRecruiter), { status: 403 });
    await permissions.change(owner, project.id, {
      view: [],
      post: [person(designer)],
      manage: [person(designer)],
    });
    await permissions.change(designer, project.id, withRecruiter);

    assert.deepEqual(await sees(recruiter), ['project']);
    assert.deepEqual(await sees(owner), []);
  });

  await t.test('a personal invitation can be left, a role cannot', async () => {
    const { owner, designer, recruiter, open, sees } = await office();
    const design = await roles.create(owner, { name: 'Design' });
    await roleMembers.add(owner, design.id, [designer.id]);
    const project = await open('project', { post: [role(design.id), person(recruiter)] });

    await permissions.leave(recruiter, project.id);
    await assert.rejects(permissions.leave(designer, project.id), { status: 409 });

    assert.deepEqual(await sees(recruiter), []);
    assert.deepEqual(await sees(designer), ['project']);
  });

  await t.test('deleting a role removes the access it gave', async () => {
    const { owner, designer, open, sees } = await office();
    const design = await roles.create(owner, { name: 'Design' });
    await roleMembers.add(owner, design.id, [designer.id]);
    await open('design', { post: [role(design.id)] });

    await roles.remove(owner, design.id);

    assert.deepEqual(await sees(designer), []);
  });

  await t.test('whoever leaves the workspace leaves its channels', async () => {
    const { owner, manager, designer, open } = await office();
    const general = await open('general', { view: [everyone], post: [everyone] });

    await people.remove(manager, designer.profile.oidcUserId);

    const remaining = await memberships.list(owner, general.id);
    assert.equal(
      remaining.some((entry) => entry.memberId === designer.id),
      false,
    );
    assert.deepEqual(lastAccessChange()?.revoked, [
      { channelId: general.id, memberId: designer.id },
    ]);
    await assert.rejects(people.remove(manager, owner.profile.oidcUserId), { status: 403 });
  });

  await t.test('deleting a channel tells everyone in it that it is gone', async () => {
    const { owner, designer, recruiter, open } = await office();
    const project = await open('project', { post: [person(designer), person(recruiter)] });

    await directory.remove(owner, project.id);

    const revoked = (lastAccessChange()?.revoked ?? []).map((pair) => pair.memberId).sort();
    assert.deepEqual(revoked, [owner.id, designer.id, recruiter.id].sort());
  });

  await t.test('direct messages are left as they are', async () => {
    const { owner, designer, recruiter } = await office();
    const conversation = await seed.conversation(designer, recruiter);
    const design = await roles.create(owner, { name: 'Design' });

    await roleMembers.add(owner, design.id, [designer.id]);
    await roleMembers.remove(owner, design.id, designer.id);

    await policy.requirePostAccess(designer, conversation.channelId);
  });

  await t.test('role order and hoist decide how people are shown', async () => {
    const { owner, designer, recruiter, open } = await office();
    const design = await roles.create(owner, { name: 'Design', color: '#3b82f6' });
    const leads = await roles.create(owner, { name: 'Leads' });
    await roleMembers.add(owner, design.id, [designer.id]);
    await roleMembers.add(owner, leads.id, [designer.id]);
    const general = await open('general', { post: [everyone] });

    await roles.reorder(owner, [leads.id, design.id]);
    await roles.update(owner, leads.id, { isHoisted: false });

    const listed = await memberships.list(designer, general.id);
    const shown = listed.find((entry) => entry.memberId === designer.id);
    const profile = await people.profile(recruiter, designer.id);
    assert.equal(shown?.hoistedRoleId, design.id);
    assert.equal(shown?.roleColor, '#3b82f6');
    assert.deepEqual(
      profile.roles.map((badge) => badge.name),
      ['Leads', 'Design'],
    );
  });

  await t.test('only managers shape the workspace, and only its owner appoints them', async () => {
    const { owner, manager, designer, recruiter, open } = await office();
    const design = await roles.create(manager, { name: 'Design' });

    await assert.rejects(open('ideas', { view: [everyone] }, designer), { status: 403 });
    await assert.rejects(roles.create(designer, { name: 'Sales' }), { status: 403 });
    await assert.rejects(roleMembers.add(designer, design.id, [recruiter.id]), { status: 403 });
    await assert.rejects(people.changeAccessLevel(manager, designer.id, 'manager'), {
      status: 403,
    });
    await assert.rejects(people.changeAccessLevel(owner, owner.id, 'member'), { status: 409 });
    const promoted = await people.changeAccessLevel(owner, designer.id, 'manager');

    assert.equal(promoted.accessLevel, 'manager');
    await directory.list(promoted, 'all');
  });
});
