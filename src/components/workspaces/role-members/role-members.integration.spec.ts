import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { eq } from 'drizzle-orm';

import * as schema from '@/database/drizzle/schema';
import { channelAccessOnPostgres } from '@/testing/channel-access';
import { seedConversations } from '@/testing/conversations';
import { migratedDatabase } from '@/testing/pglite';

test('role members on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const { people, roles, roleMembers } = channelAccessOnPostgres(db);
  const seed = seedConversations(db);

  async function office() {
    const workspaceId = await seed.workspace();
    const join = async (name: string) => seed.join(workspaceId, await seed.person(name));

    const owner = await seed.join(workspaceId, await seed.person('Maria'), 'owner');
    return { owner, designer: await join('Olena'), recruiter: await join('Ihor') };
  }

  await t.test('a role counts and shows only the people still in the workspace', async () => {
    const { owner, designer, recruiter } = await office();
    const design = await roles.create(owner, { name: 'Design' });
    await roleMembers.add(owner, design.id, [designer.id, recruiter.id]);

    await db
      .update(schema.workspaceMembers)
      .set({ status: 'removed' })
      .where(eq(schema.workspaceMembers.id, recruiter.id));

    const [counted] = await roles.list(owner);
    const holders = await roleMembers.list(owner, design.id);
    const profile = await people.profile(owner, designer.id);
    assert.equal(counted?.memberCount, 1);
    assert.deepEqual(
      holders.map((holder) => holder.displayName),
      ['Olena'],
    );
    assert.deepEqual(profile.roles, [{ id: design.id, name: 'Design', color: null }]);
  });

  await t.test('only people of the workspace join a role, each once', async () => {
    const { owner, designer } = await office();
    const outsider = (await office()).designer;
    const design = await roles.create(owner, { name: 'Design' });

    await roleMembers.add(owner, design.id, [designer.id, outsider.id]);
    await roleMembers.add(owner, design.id, [designer.id]);

    const holders = await roleMembers.list(owner, design.id);
    assert.deepEqual(
      holders.map((holder) => holder.memberId),
      [designer.id],
    );
  });

  await t.test('a role that does not exist is not found', async () => {
    const { owner, designer } = await office();
    const missing = randomUUID();

    await assert.rejects(roleMembers.list(owner, missing), { status: 404 });
    await assert.rejects(roleMembers.add(owner, missing, [designer.id]), { status: 404 });
  });
});
