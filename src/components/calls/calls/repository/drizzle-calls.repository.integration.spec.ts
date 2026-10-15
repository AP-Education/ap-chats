import assert from 'node:assert/strict';
import { test } from 'node:test';

import { eq } from 'drizzle-orm';

import * as schema from '@/database/drizzle/schema';
import { seedConversations } from '@/testing/conversations';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { DrizzleCallsRepository } from './drizzle-calls.repository';

test('a member who left the workspace is never rung', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const calls = new DrizzleCallsRepository(transactionHost(db) as never);
  const seed = seedConversations(db);
  const ann = await seed.person('Ann');
  const bob = await seed.person('Bob');
  const office = await seed.workspace();
  const bobAtOffice = await seed.join(office, bob);
  const { channelId } = await seed.conversation(await seed.join(office, ann), bobAtOffice);

  assert.deepEqual(
    new Set(await calls.ringRecipients(channelId, [])),
    new Set([ann.oidcUserId, bob.oidcUserId]),
  );

  await db
    .update(schema.workspaceMembers)
    .set({ status: 'removed' })
    .where(eq(schema.workspaceMembers.id, bobAtOffice.id));

  assert.deepEqual(await calls.ringRecipients(channelId, []), [ann.oidcUserId]);
});
