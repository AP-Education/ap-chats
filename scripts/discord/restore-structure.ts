import { and, eq, sql } from 'drizzle-orm';

import {
  channelCategories,
  channelGrants,
  channelMemberAccess,
  channelMemberships,
  channels,
  roleMembers,
  roles,
} from '../../src/database/drizzle/schema';
import type { GuildDump } from './dump-format';
import { importedId, inBatches, newTally, type Tally, type Tx } from './restore-ids';

/** Where each Discord object landed, by its Discord id. */
export interface RestoredIds {
  roles: Map<string, string>;
  categories: Map<string, string>;
  channels: Map<string, string>;
  members: Map<string, string>;
}

// A row made by hand under the same name is adopted rather than duplicated.
function findExisting<Row extends { id: string; name: string | null }>(
  rows: Row[],
  id: string,
  name: string,
): Row | undefined {
  return (
    rows.find((row) => row.id === id) ??
    rows.find((row) => row.name?.toLowerCase() === name.toLowerCase())
  );
}

export async function upsertRoles(
  tx: Tx,
  workspaceId: string,
  dump: GuildDump,
  roleIds: Map<string, string>,
): Promise<Tally> {
  const tally = newTally();
  const existing = await tx.select().from(roles).where(eq(roles.workspaceId, workspaceId));

  for (const role of dump.roles) {
    const id = importedId(workspaceId, role.id);
    const values = {
      name: role.name,
      color: role.color,
      position: role.position,
      isHoisted: role.isHoisted,
    };
    const current = findExisting(existing, id, role.name);

    if (!current) {
      await tx.insert(roles).values({ id, workspaceId, ...values });
      tally.created++;
    } else if (
      current.name !== values.name ||
      current.color !== values.color ||
      current.position !== values.position ||
      current.isHoisted !== values.isHoisted
    ) {
      await tx
        .update(roles)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(roles.id, current.id));
      tally.updated++;
    } else {
      tally.unchanged++;
    }

    roleIds.set(role.id, current?.id ?? id);
  }
  return tally;
}

export async function upsertCategories(
  tx: Tx,
  workspaceId: string,
  dump: GuildDump,
  categoryIds: Map<string, string>,
): Promise<Tally> {
  const tally = newTally();
  const existing = await tx
    .select()
    .from(channelCategories)
    .where(eq(channelCategories.workspaceId, workspaceId));

  for (const category of dump.categories) {
    const id = importedId(workspaceId, category.id);
    const values = { name: category.name, position: category.position };
    const current = findExisting(existing, id, category.name);

    if (!current) {
      await tx.insert(channelCategories).values({ id, workspaceId, ...values });
      tally.created++;
    } else if (current.name !== values.name || current.position !== values.position) {
      await tx
        .update(channelCategories)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(channelCategories.id, current.id));
      tally.updated++;
    } else {
      tally.unchanged++;
    }

    categoryIds.set(category.id, current?.id ?? id);
  }
  return tally;
}

export async function upsertChannels(
  tx: Tx,
  workspaceId: string,
  ownerMemberId: string,
  dump: GuildDump,
  ids: RestoredIds,
): Promise<Tally> {
  const tally = newTally();
  const existing = await tx
    .select({ id: channels.id, name: channels.name, categoryId: channels.categoryId })
    .from(channels)
    .where(and(eq(channels.workspaceId, workspaceId), eq(channels.kind, 'channel')));

  for (const channel of dump.channels) {
    const id = importedId(workspaceId, channel.id);
    const categoryId = channel.categoryId ? (ids.categories.get(channel.categoryId) ?? null) : null;
    const current = findExisting(existing, id, channel.name);

    if (!current) {
      await tx.insert(channels).values({
        id,
        workspaceId,
        kind: 'channel',
        name: channel.name,
        categoryId,
        createdByMemberId: ownerMemberId,
      });
      tally.created++;
    } else if (current.name !== channel.name || current.categoryId !== categoryId) {
      await tx
        .update(channels)
        .set({ name: channel.name, categoryId, updatedAt: new Date() })
        .where(eq(channels.id, current.id));
      tally.updated++;
    } else {
      tally.unchanged++;
    }

    ids.channels.set(channel.id, current?.id ?? id);
  }
  return tally;
}

export async function insertGrants(
  tx: Tx,
  workspaceId: string,
  dump: GuildDump,
  ids: RestoredIds,
): Promise<number> {
  const rows = dump.channels.flatMap((channel) => {
    const channelId = ids.channels.get(channel.id)!;

    return (channel.grants ?? []).map((grant) => {
      const base = {
        workspaceId,
        channelId,
        capability: grant.capability,
        principal: grant.principal,
      };
      switch (grant.principal) {
        case 'everyone':
          return base;
        case 'role':
          return { ...base, roleId: ids.roles.get(grant.roleId)! };
        case 'member':
          return { ...base, memberId: ids.members.get(grant.personId)! };
      }
    });
  });

  let added = 0;
  for (const batch of inBatches(rows)) {
    const inserted = await tx
      .insert(channelGrants)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: channelGrants.id });
    added += inserted.length;
  }
  return added;
}

export async function insertRoleHolders(
  tx: Tx,
  workspaceId: string,
  dump: GuildDump,
  ids: RestoredIds,
): Promise<number> {
  const rows = dump.people.flatMap((person) =>
    person.roleIds
      .filter((roleId) => ids.roles.has(roleId))
      .map((roleId) => ({
        workspaceId,
        roleId: ids.roles.get(roleId)!,
        memberId: ids.members.get(person.id)!,
      })),
  );

  let added = 0;
  for (const batch of inBatches(rows)) {
    const inserted = await tx
      .insert(roleMembers)
      .values(batch)
      .onConflictDoNothing()
      .returning({ roleId: roleMembers.roleId });
    added += inserted.length;
  }
  return added;
}

// Same rule the app applies after any list change: whoever is listed sees the channel, nothing unread.
export async function addListedParticipants(tx: Tx, workspaceId: string): Promise<number> {
  const listed = tx
    .select({
      workspaceId: channelMemberAccess.workspaceId,
      channelId: channelMemberAccess.channelId,
      memberId: channelMemberAccess.memberId,
      lastReadEntrySeq: channels.lastEntrySeq,
    })
    .from(channelMemberAccess)
    .innerJoin(channels, eq(channels.id, channelMemberAccess.channelId))
    .where(eq(channelMemberAccess.workspaceId, workspaceId));

  const { rows } = await tx.execute(sql`
    insert into ${channelMemberships} (workspace_id, channel_id, member_id, last_read_entry_seq)
    ${listed}
    on conflict (channel_id, member_id) do nothing
    returning channel_id
  `);
  return rows.length;
}
