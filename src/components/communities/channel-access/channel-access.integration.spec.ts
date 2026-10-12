import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { and, eq } from 'drizzle-orm';

import { MemberAccessProjections, type Principal } from '@/components/workspaces/access';
import { DrizzleWorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceAccessLevel, WorkspaceMember } from '@/components/workspaces/members/types';
import { WorkspaceMembersService } from '@/components/workspaces/members/workspace-members.service';
import { DrizzleRolesRepository } from '@/components/workspaces/roles/repository';
import { RolesService } from '@/components/workspaces/roles/roles.service';
import * as schema from '@/database/drizzle/schema';
import type { EventPublisher } from '@/globals/publisher/event-publisher';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { DrizzleChannelCategoriesRepository } from '../channel-categories/repository';
import { ChannelsService } from '../channels/channels.service';
import { DrizzleChannelsRepository } from '../channels/repository';
import { ChannelMembershipsService } from '../memberships/channel-memberships.service';
import { DrizzleChannelMembershipsRepository } from '../memberships/repository';
import { ChannelAccessFacade } from './channel-access.facade';
import { CommunityAccessService } from './community-access.service';
import { ChannelPermissionsService } from './permissions/channel-permissions.service';
import { DrizzleChannelPermissionsRepository } from './permissions/repository/drizzle-channel-permissions.repository';
import type { ChannelPermissions } from './permissions/types';
import { DrizzleChannelAccessRepository } from './repository/drizzle-channel-access.repository';
import { ChannelAccessSync } from './sync/channel-access.sync';
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

  const tx = transactionHost(db) as never;
  const announced: ChannelAccessChangedEvent[] = [];
  const events = {
    publish: (key: string, event: unknown) => {
      if (key === CHANNEL_ACCESS_CHANGED_EVENT) announced.push(event as ChannelAccessChangedEvent);
    },
  } as EventPublisher;

  const projections = new MemberAccessProjections();
  const sync = new ChannelAccessSync(
    new DrizzleChannelMembershipsRepository(tx),
    events,
    projections,
  );
  sync.onModuleInit();

  const channelsRepository = new DrizzleChannelsRepository(tx);
  const permissionsRepository = new DrizzleChannelPermissionsRepository(tx);
  const community = new CommunityAccessService(channelsRepository);
  const channels = new ChannelsService(
    channelsRepository,
    new DrizzleChannelCategoriesRepository(tx),
    community,
    permissionsRepository,
    sync,
  );
  const permissions = new ChannelPermissionsService(community, permissionsRepository, sync);
  const memberships = new ChannelMembershipsService(
    new DrizzleChannelMembershipsRepository(tx),
    community,
    permissionsRepository,
    sync,
  );
  const rolesRepository = new DrizzleRolesRepository(tx);
  const roles = new RolesService(rolesRepository, projections);
  const people = new WorkspaceMembersService(
    new DrizzleWorkspaceMembersRepository(tx),
    rolesRepository,
  );
  const access = new ChannelAccessFacade(new DrizzleChannelAccessRepository(tx));

  async function workspace() {
    const workspaceId = randomUUID();
    await db.insert(schema.workspaces).values({ id: workspaceId, name: 'AP' });

    const join = async (name: string, accessLevel: WorkspaceAccessLevel = 'member') => {
      const member: WorkspaceMember = {
        id: randomUUID(),
        workspaceId,
        userProfileId: randomUUID(),
        profile: {
          id: '',
          oidcUserId: `${name}-${randomUUID()}`,
          displayName: name,
          avatarPath: null,
        },
        accessLevel,
        status: 'active',
        leftAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      member.profile.id = member.userProfileId;
      await db.insert(schema.userProfiles).values({
        id: member.userProfileId,
        oidcUserId: member.profile.oidcUserId,
        displayName: name,
      });
      await db.insert(schema.workspaceMembers).values({
        id: member.id,
        workspaceId,
        userProfileId: member.userProfileId,
        accessLevel,
      });
      return member;
    };

    const owner = await join('Maria', 'owner');
    const manager = await join('Andrii', 'manager');
    const designer = await join('Olena');
    const recruiter = await join('Ihor');

    const open = (name: string, lists: Partial<ChannelPermissions>, by = owner) =>
      channels.create(by, {
        name,
        permissions: { view: [], post: [], manage: [], ...lists } as never,
      });
    const sees = async (member: WorkspaceMember) =>
      (await channels.list(member, 'mine')).map((channel) => channel.name);

    return { workspaceId, join, owner, manager, designer, recruiter, open, sees };
  }

  await t.test('an open channel reaches everyone without joining', async () => {
    const office = await workspace();

    const general = await office.open('general', { view: [everyone], post: [everyone] });

    assert.deepEqual(general.isOpen, true);
    assert.deepEqual(general.canManage, true);
    for (const member of [office.owner, office.designer, office.recruiter])
      assert.deepEqual(await office.sees(member), ['general']);
    const [seenByDesigner] = await channels.list(office.designer, 'mine');
    assert.equal(seenByDesigner?.canPost, true);
    assert.equal(seenByDesigner?.canManage, false);
  });

  await t.test('a role brings its people in and takes them out', async () => {
    const office = await workspace();
    const design = await roles.create(office.owner, { name: 'Design' });
    const channel = await office.open('design', { post: [role(design.id)] });

    announced.length = 0;
    await roles.addMembers(office.manager, design.id, [office.designer.id]);
    assert.deepEqual(await office.sees(office.designer), ['design']);
    assert.deepEqual(announced.at(-1)?.changes.granted, [
      { channelId: channel.id, memberId: office.designer.id },
    ]);

    await roles.removeMember(office.manager, design.id, office.designer.id);
    assert.deepEqual(await office.sees(office.designer), []);
    assert.deepEqual(announced.at(-1)?.changes.revoked, [
      { channelId: channel.id, memberId: office.designer.id },
    ]);
  });

  await t.test('a newcomer sees the history but none of it as unread', async () => {
    const office = await workspace();
    const design = await roles.create(office.owner, { name: 'Design' });
    const channel = await office.open('design', { post: [role(design.id)] });
    await db
      .update(schema.channels)
      .set({ lastEntrySeq: 42n })
      .where(eq(schema.channels.id, channel.id));

    await roles.addMembers(office.owner, design.id, [office.designer.id]);

    const [membership] = await db
      .select({ lastRead: schema.channelMemberships.lastReadEntrySeq })
      .from(schema.channelMemberships)
      .where(
        and(
          eq(schema.channelMemberships.channelId, channel.id),
          eq(schema.channelMemberships.memberId, office.designer.id),
        ),
      );
    assert.equal(membership?.lastRead, 42n);
  });

  await t.test('announcements are read by everyone and written by one role', async () => {
    const office = await workspace();
    const hr = await roles.create(office.owner, { name: 'HR' });
    await roles.addMembers(office.owner, hr.id, [office.recruiter.id]);
    const announcements = await office.open('announcements', {
      view: [everyone],
      post: [role(hr.id)],
    });

    await access.requireReadAccess(office.designer, announcements.id);
    await access.requireParticipant(office.designer, announcements.id);
    await assert.rejects(access.requirePostAccess(office.designer, announcements.id), {
      status: 403,
    });
    assert.equal(
      (await access.requirePostAccess(office.recruiter, announcements.id)).canPost,
      true,
    );
  });

  await t.test('workspace managers run every channel without reading it', async () => {
    const office = await workspace();
    const hr = await roles.create(office.owner, { name: 'HR' });
    const cases = await office.open('hr-cases', { post: [role(hr.id)], manage: [] }, office.owner);

    assert.deepEqual(await office.sees(office.manager), []);
    const [listed] = (await channels.list(office.manager, 'all')).filter(
      (channel) => channel.id === cases.id,
    );
    assert.equal(listed?.isMember, false);
    assert.equal(listed?.canManage, true);
    assert.deepEqual((await permissions.describe(office.manager, cases.id)).post, [
      { kind: 'role', roleId: hr.id, name: 'HR', color: null },
    ]);
    await assert.rejects(access.requireViewAccess(office.manager, cases.id), { status: 404 });
    await assert.rejects(channels.list(office.designer, 'all'), { status: 403 });
  });

  await t.test('only the channel managers change who has access', async () => {
    const office = await workspace();
    const project = await office.open('project', { post: [person(office.designer)] });
    const lists = {
      view: [],
      post: [person(office.designer), person(office.recruiter)],
      manage: [],
    };

    await assert.rejects(permissions.change(office.designer, project.id, lists), { status: 403 });

    await permissions.change(office.owner, project.id, {
      ...lists,
      manage: [person(office.designer)],
    });
    await permissions.change(office.designer, project.id, lists);
    assert.deepEqual(await office.sees(office.recruiter), ['project']);
    assert.deepEqual(await office.sees(office.owner), []);
  });

  await t.test('a personal invitation can be left, a role cannot', async () => {
    const office = await workspace();
    const design = await roles.create(office.owner, { name: 'Design' });
    await roles.addMembers(office.owner, design.id, [office.designer.id]);
    const project = await office.open('project', {
      post: [role(design.id), person(office.recruiter)],
    });

    await memberships.leave(office.recruiter, project.id);
    assert.deepEqual(await office.sees(office.recruiter), []);

    await assert.rejects(memberships.leave(office.designer, project.id), { status: 409 });
    assert.deepEqual(await office.sees(office.designer), ['project']);
  });

  await t.test('deleting a role removes the access it gave', async () => {
    const office = await workspace();
    const design = await roles.create(office.owner, { name: 'Design' });
    await roles.addMembers(office.owner, design.id, [office.designer.id]);
    await office.open('design', { post: [role(design.id)] });

    await roles.remove(office.owner, design.id);

    assert.deepEqual(await office.sees(office.designer), []);
  });

  await t.test('direct messages are left as they are', async () => {
    const office = await workspace();
    const dmId = randomUUID();
    await db.insert(schema.channels).values({
      id: dmId,
      workspaceId: office.workspaceId,
      kind: 'dm',
      createdByMemberId: office.designer.id,
    });
    await db.insert(schema.channelMemberships).values([
      { workspaceId: office.workspaceId, channelId: dmId, memberId: office.designer.id },
      { workspaceId: office.workspaceId, channelId: dmId, memberId: office.recruiter.id },
    ]);
    const [first, second] = [office.designer.id, office.recruiter.id].sort();
    await db.insert(schema.directMessages).values({
      workspaceId: office.workspaceId,
      channelId: dmId,
      firstMemberId: first!,
      secondMemberId: second!,
    });
    const design = await roles.create(office.owner, { name: 'Design' });

    await roles.addMembers(office.owner, design.id, [office.designer.id]);
    await roles.removeMember(office.owner, design.id, office.designer.id);

    assert.equal((await access.requirePostAccess(office.designer, dmId)).canPost, true);
  });

  await t.test(
    'role order and hoist shape how people are shown, not what they may do',
    async () => {
      const office = await workspace();
      const design = await roles.create(office.owner, { name: 'Design', color: '#3b82f6' });
      const leads = await roles.create(office.owner, { name: 'Leads' });
      await roles.addMembers(office.owner, design.id, [office.designer.id]);
      await roles.addMembers(office.owner, leads.id, [office.designer.id]);
      const general = await office.open('general', { post: [everyone] });

      assert.deepEqual(
        (await roles.list(office.designer)).map((role) => role.name),
        ['Design', 'Leads'],
      );

      assert.equal(leads.isHoisted, true);
      await roles.reorder(office.owner, [leads.id, design.id]);
      await roles.update(office.owner, leads.id, { isHoisted: false });

      const listed = await memberships.list(office.designer, general.id);
      const designer = listed.find((entry) => entry.memberId === office.designer.id);
      assert.equal(designer?.hoistedRoleId, design.id);
      assert.equal(designer?.roleColor, '#3b82f6');
      assert.deepEqual(
        (await people.profile(office.recruiter, office.designer.id)).roles.map((role) => role.name),
        ['Leads', 'Design'],
      );
      assert.equal((await access.requirePostAccess(office.designer, general.id)).canManage, false);
    },
  );

  await t.test('only managers shape the workspace and only owners appoint managers', async () => {
    const office = await workspace();

    await assert.rejects(office.open('ideas', { view: [everyone] }, office.designer), {
      status: 403,
    });
    await assert.rejects(roles.create(office.designer, { name: 'Design' }), { status: 403 });
    await assert.rejects(people.changeAccessLevel(office.manager, office.designer.id, 'manager'), {
      status: 403,
    });
    await assert.rejects(people.changeAccessLevel(office.owner, office.owner.id, 'member'), {
      status: 409,
    });

    const promoted = await people.changeAccessLevel(office.owner, office.designer.id, 'manager');
    assert.equal(promoted.accessLevel, 'manager');
    assert.equal((await office.open('ideas', { view: [everyone] }, promoted)).name, 'ideas');
  });
});
