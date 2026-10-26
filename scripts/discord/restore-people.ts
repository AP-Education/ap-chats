import { and, eq, inArray, sql } from 'drizzle-orm';

import {
  channelGrants,
  chatMessages,
  chatUploads,
  messageMentions,
  messagePins,
  messageReactions,
  roleMembers,
  userProfiles,
  workspaceMembers,
} from '../../src/database/drizzle/schema';
import type { DumpedPerson } from './dump-format';
import { placeholderOidcUserId } from './placeholders';
import { inBatches, type Tx } from './restore-ids';

export interface RestoredPeople {
  members: Map<string, string>;
  linkedMembersAdded: number;
  placeholdersAdded: number;
  claimed: number;
}

export async function findOwnerMemberId(tx: Tx, workspaceId: string): Promise<string> {
  const [owner] = await tx
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.accessLevel, 'owner'),
        eq(workspaceMembers.status, 'active'),
      ),
    )
    .limit(1);
  if (!owner) throw new Error(`Workspace ${workspaceId} not found or has no active owner`);

  return owner.id;
}

async function findMemberIdsByOidc(
  tx: Tx,
  workspaceId: string,
  oidcUserIds: string[],
): Promise<Map<string, string>> {
  const memberIds = new Map<string, string>();

  for (const batch of inBatches(oidcUserIds)) {
    const rows = await tx
      .select({ id: workspaceMembers.id, oidcUserId: userProfiles.oidcUserId })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), inArray(userProfiles.oidcUserId, batch)),
      );
    for (const row of rows) memberIds.set(row.oidcUserId, row.id);
  }
  return memberIds;
}

// A linked person is a colleague with an AP account: they join the workspace as themselves, and
// their first sign-in takes the profile over, name and avatar included. A former member stays one.
async function addLinkedMembers(
  tx: Tx,
  workspaceId: string,
  people: DumpedPerson[],
  oidcByPerson: Record<string, string>,
): Promise<number> {
  const linked = people.filter((person) => oidcByPerson[person.id]);
  let added = 0;

  for (const batch of inBatches(linked)) {
    await tx
      .insert(userProfiles)
      .values(
        batch.map((person) => ({
          oidcUserId: oidcByPerson[person.id]!,
          displayName: person.displayName,
        })),
      )
      .onConflictDoNothing();
    const profiles = await tx
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(
        inArray(
          userProfiles.oidcUserId,
          batch.map((person) => oidcByPerson[person.id]!),
        ),
      );

    const inserted = await tx
      .insert(workspaceMembers)
      .values(profiles.map((profile) => ({ workspaceId, userProfileId: profile.id })))
      .onConflictDoNothing()
      .returning({ id: workspaceMembers.id });
    added += inserted.length;
  }
  return added;
}

// Stands in for a Discord user until a real account claims it, so their history keeps an author.
// Not active: it holds roles and grants but sees nothing and is not listed as a member.
async function addPlaceholderMembers(
  tx: Tx,
  workspaceId: string,
  people: DumpedPerson[],
  avatarUrls: Map<string, string>,
): Promise<{ memberIds: Map<string, string>; added: number }> {
  let added = 0;

  for (const batch of inBatches(people)) {
    const profiles = await tx
      .insert(userProfiles)
      .values(
        batch.map((person) => ({
          oidcUserId: placeholderOidcUserId(person.id),
          displayName: person.displayName,
          avatarPath: avatarUrls.get(person.id) ?? null,
          isBot: person.isBot,
        })),
      )
      .onConflictDoUpdate({
        target: userProfiles.oidcUserId,
        set: {
          displayName: sql`excluded.display_name`,
          avatarPath: sql`excluded.avatar_path`,
          isBot: sql`excluded.is_bot`,
        },
      })
      .returning({ id: userProfiles.id });

    const inserted = await tx
      .insert(workspaceMembers)
      .values(
        profiles.map((profile) => ({
          workspaceId,
          userProfileId: profile.id,
          status: 'removed' as const,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: workspaceMembers.id });
    added += inserted.length;
  }

  const memberIdsByOidc = await findMemberIdsByOidc(
    tx,
    workspaceId,
    people.map((person) => placeholderOidcUserId(person.id)),
  );
  const memberIds = new Map(
    people.map((person) => [person.id, memberIdsByOidc.get(placeholderOidcUserId(person.id))!]),
  );
  return { memberIds, added };
}

// Hands the person everything the import gave their placeholder; nothing else ever refers to one.
async function claimPlaceholder(tx: Tx, placeholderId: string, memberId: string): Promise<void> {
  await tx
    .update(chatMessages)
    .set({ authorMemberId: memberId })
    .where(eq(chatMessages.authorMemberId, placeholderId));
  await tx
    .update(chatMessages)
    .set({ forwardedFromMemberId: memberId })
    .where(eq(chatMessages.forwardedFromMemberId, placeholderId));
  await tx
    .update(messagePins)
    .set({ pinnedByMemberId: memberId })
    .where(eq(messagePins.pinnedByMemberId, placeholderId));
  await tx
    .update(chatUploads)
    .set({ ownerMemberId: memberId })
    .where(eq(chatUploads.ownerMemberId, placeholderId));

  const [from, to] = [`:member[${placeholderId}]`, `:member[${memberId}]`];
  await tx
    .update(chatMessages)
    .set({ contentMarkdown: sql`replace(${chatMessages.contentMarkdown}, ${from}, ${to})` })
    .where(sql`strpos(${chatMessages.contentMarkdown}, ${from}) > 0`);

  // These hold one row per person, which the person may already have of their own.
  await tx.execute(sql`
    insert into ${messageReactions} (workspace_id, channel_id, message_id, emoji, member_id, created_at)
    select workspace_id, channel_id, message_id, emoji, ${memberId}::uuid, created_at
    from ${messageReactions} where member_id = ${placeholderId}
    on conflict do nothing
  `);
  await tx.delete(messageReactions).where(eq(messageReactions.memberId, placeholderId));

  await tx.execute(sql`
    insert into ${messageMentions} (workspace_id, channel_id, message_id, member_id, via)
    select workspace_id, channel_id, message_id, ${memberId}::uuid, via
    from ${messageMentions} where member_id = ${placeholderId}
    on conflict do nothing
  `);
  await tx.delete(messageMentions).where(eq(messageMentions.memberId, placeholderId));

  await tx.execute(sql`
    insert into ${roleMembers} (workspace_id, role_id, member_id, created_at)
    select workspace_id, role_id, ${memberId}::uuid, created_at
    from ${roleMembers} where member_id = ${placeholderId}
    on conflict do nothing
  `);
  await tx.delete(roleMembers).where(eq(roleMembers.memberId, placeholderId));

  await tx.execute(sql`
    insert into ${channelGrants} (workspace_id, channel_id, capability, principal, member_id, created_at)
    select workspace_id, channel_id, capability, principal, ${memberId}::uuid, created_at
    from ${channelGrants} where member_id = ${placeholderId}
    on conflict do nothing
  `);
  await tx.delete(channelGrants).where(eq(channelGrants.memberId, placeholderId));

  await tx.delete(workspaceMembers).where(eq(workspaceMembers.id, placeholderId));
}

/**
 * A linked person is in the workspace as themselves, and takes over their placeholder if an earlier
 * run made one; everyone else gets a placeholder.
 */
export async function resolvePeople(
  tx: Tx,
  workspaceId: string,
  people: DumpedPerson[],
  oidcByPerson: Record<string, string>,
  avatarUrls: Map<string, string>,
): Promise<RestoredPeople> {
  const linkedMembersAdded = await addLinkedMembers(tx, workspaceId, people, oidcByPerson);
  const linkedMemberIds = await findMemberIdsByOidc(tx, workspaceId, Object.values(oidcByPerson));
  const memberOf = (personId: string) => {
    const oidcUserId = oidcByPerson[personId];
    return oidcUserId ? linkedMemberIds.get(oidcUserId) : undefined;
  };

  const linked = people.filter((person) => memberOf(person.id));
  const unlinked = people.filter((person) => !memberOf(person.id));
  const placeholders = await addPlaceholderMembers(tx, workspaceId, unlinked, avatarUrls);

  const earlierPlaceholders = await findMemberIdsByOidc(
    tx,
    workspaceId,
    linked.map((person) => placeholderOidcUserId(person.id)),
  );
  for (const person of linked) {
    const placeholderId = earlierPlaceholders.get(placeholderOidcUserId(person.id));
    if (placeholderId) await claimPlaceholder(tx, placeholderId, memberOf(person.id)!);
  }

  const members = new Map(
    people.map((person) => [
      person.id,
      memberOf(person.id) ?? placeholders.memberIds.get(person.id)!,
    ]),
  );
  return {
    members,
    linkedMembersAdded,
    placeholdersAdded: placeholders.added,
    claimed: earlierPlaceholders.size,
  };
}
