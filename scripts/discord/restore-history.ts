import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { and, eq, gte, inArray, max, sql } from 'drizzle-orm';

import { linkedGif, type MessageGif } from '../../src/components/social/content/message-gif';
import { MessageMarkdownService } from '../../src/components/social/content/message-markdown';
import type { MentionTargets } from '../../src/components/social/mentions/types';
import {
  activeRoleMembers,
  channelEntries,
  channelMemberships,
  channels,
  chatMessages,
  chatUploads,
  messageMentions,
  messagePins,
  messageReactions,
  messageRoleMentions,
  type StoredAttachment,
  workspaceMembers,
} from '../../src/database/drizzle/schema';
import { type ChannelHistory, DISCORD_REFERENCE, type DumpedMessage } from './dump-format';
import { attachmentObjectKey } from './restore-files';
import { importedId, inBatches, newTally, type Tally, type Tx } from './restore-ids';
import type { RestoredIds } from './restore-structure';

// Marks an upload that came whole from Discord: it never had a multipart session to abort.
const IMPORTED_MULTIPART_ID = 'discord-import';
const ATTACHED_LIFETIME_MS = 24 * 60 * 60 * 1000;

interface RestoredMessage {
  discordId: bigint;
  dumped: DumpedMessage;
  id: string;
  channelId: string;
  authorMemberId: string;
  markdown: string;
  mentions: MentionTargets;
  attachments: StoredAttachment[];
  gif: MessageGif | null;
}

/** A new message's @everyone and role pings, to reach people once the channels have them. */
export interface BroadMention {
  messageId: string;
  everyone: boolean;
  roleIds: string[];
}

/** The entries a run appended, by channel. */
export type AppendedEntries = Map<string, { firstSeq: bigint; lastSeq: bigint }>;

export interface HistoryReport {
  messages: Tally;
  /** New messages older than what a channel already showed: entries only append, so they land last. */
  appendedOutOfOrder: number;
  uploadsAdded: number;
  reactionsAdded: number;
  mentionsAdded: number;
  pinsAdded: number;
}

const markdownService = new MessageMarkdownService();

function withRestoredReferences(markdown: string, ids: RestoredIds): string {
  const restored = { member: ids.members, role: ids.roles, channel: ids.channels } as const;

  return markdown.replace(
    DISCORD_REFERENCE,
    (_, kind: keyof typeof restored, discordId: string) => {
      const id = restored[kind].get(discordId);
      if (!id) throw new Error(`No ${kind} restored for Discord ${discordId}`);
      return `:${kind}[${id}]`;
    },
  );
}

async function toRestored(
  workspaceId: string,
  history: ChannelHistory,
  ids: RestoredIds,
  files: Map<string, StoredAttachment>,
): Promise<RestoredMessage[]> {
  const channelId = ids.channels.get(history.channelId)!;
  const restored: RestoredMessage[] = [];

  for (const dumped of history.messages) {
    const attachments = dumped.attachments.map((attachment) => files.get(attachment.id)!);
    const content = await markdownService.normalize(
      withRestoredReferences(dumped.markdown, ids),
      attachments.length > 0,
    );
    restored.push({
      discordId: BigInt(dumped.id),
      dumped,
      id: importedId(workspaceId, dumped.id),
      channelId,
      authorMemberId: ids.members.get(dumped.authorId)!,
      markdown: content.markdown,
      mentions: content.mentions,
      attachments,
      // The app's own rule: a GIF shows only for a GIF link the text makes.
      gif: linkedGif(dumped.gif ?? undefined, content.links),
    });
  }
  return restored;
}

function requestDigest(dumped: DumpedMessage): string {
  return createHash('sha256').update(`discord:${dumped.id}`).digest('hex');
}

async function existingMessages(tx: Tx, ids: string[]) {
  const rows = [];
  for (const batch of inBatches(ids)) {
    rows.push(
      ...(await tx
        .select({
          id: chatMessages.id,
          contentMarkdown: chatMessages.contentMarkdown,
          attachments: chatMessages.attachments,
          gif: chatMessages.gif,
          editedAt: chatMessages.editedAt,
          revision: chatMessages.revision,
        })
        .from(chatMessages)
        .where(inArray(chatMessages.id, batch))),
    );
  }
  return new Map(rows.map((row) => [row.id, row]));
}

// Locked like the app locks a channel it appends to, so entries keep one order.
async function lockChannels(tx: Tx, channelIds: string[]) {
  const locked = await tx
    .select({ id: channels.id, lastSeq: channels.lastEntrySeq })
    .from(channels)
    .where(inArray(channels.id, channelIds))
    .for('update');
  const newest = await tx
    .select({ channelId: chatMessages.channelId, createdAt: max(chatMessages.createdAt) })
    .from(chatMessages)
    .where(inArray(chatMessages.channelId, channelIds))
    .groupBy(chatMessages.channelId);
  const newestByChannel = new Map(newest.map((row) => [row.channelId, row.createdAt]));

  return new Map(
    locked.map(({ id, lastSeq }) => [id, { lastSeq, newest: newestByChannel.get(id) ?? null }]),
  );
}

async function insertAll<Row>(
  rows: Row[],
  insert: (batch: Row[]) => Promise<unknown[]>,
): Promise<number> {
  let added = 0;
  for (const batch of inBatches(rows, 500)) added += (await insert(batch)).length;
  return added;
}

const toDate = (timestamp: string | null) => (timestamp === null ? null : new Date(timestamp));

// Each channel's new messages go after what it holds, in Discord's order.
async function appendNew(
  tx: Tx,
  workspaceId: string,
  fresh: RestoredMessage[],
  ids: RestoredIds,
  report: HistoryReport,
): Promise<AppendedEntries> {
  const channelState = await lockChannels(tx, [
    ...new Set(fresh.map((message) => message.channelId)),
  ]);
  const appended: AppendedEntries = new Map();
  const entries = fresh.map((message) => {
    const state = channelState.get(message.channelId)!;
    const createdAt = new Date(message.dumped.createdAt);
    if (state.newest && createdAt < state.newest) report.appendedOutOfOrder++;

    state.lastSeq += 1n;
    const firstSeq = appended.get(message.channelId)?.firstSeq ?? state.lastSeq;
    appended.set(message.channelId, { firstSeq, lastSeq: state.lastSeq });
    return {
      workspaceId,
      channelId: message.channelId,
      seq: state.lastSeq,
      messageId: message.id,
      createdAt,
    };
  });

  report.messages.created = await insertAll(fresh, (batch) =>
    tx
      .insert(chatMessages)
      .values(
        batch.map(({ dumped, ...message }) => ({
          id: message.id,
          workspaceId,
          channelId: message.channelId,
          authorMemberId: message.authorMemberId,
          contentMarkdown: message.markdown,
          attachments: message.attachments,
          gif: message.gif,
          replyToMessageId: dumped.replyToId && importedId(workspaceId, dumped.replyToId),
          forwardedFromMessageId:
            dumped.forwardedFrom && importedId(workspaceId, dumped.forwardedFrom.messageId),
          forwardedFromMemberId:
            dumped.forwardedFrom && ids.members.get(dumped.forwardedFrom.authorId)!,
          requestDigest: requestDigest(dumped),
          clientNonce: message.id,
          createdAt: new Date(dumped.createdAt),
          editedAt: toDate(dumped.editedAt),
        })),
      )
      .returning({ id: chatMessages.id }),
  );
  await insertAll(entries, (batch) =>
    tx.insert(channelEntries).values(batch).returning({ id: channelEntries.id }),
  );
  for (const [channelId, { lastSeq }] of appended) {
    await tx
      .update(channels)
      .set({ lastEntrySeq: lastSeq, updatedAt: new Date() })
      .where(eq(channels.id, channelId));
  }
  return appended;
}

// An earlier restored message takes Discord's later text and files, unless it was edited here.
async function refreshRestored(
  tx: Tx,
  restored: RestoredMessage[],
  existing: Awaited<ReturnType<typeof existingMessages>>,
  report: HistoryReport,
): Promise<void> {
  for (const message of restored) {
    const current = existing.get(message.id);
    if (!current) continue;

    const isChanged =
      current.contentMarkdown !== message.markdown ||
      !isDeepStrictEqual(current.attachments, message.attachments) ||
      !isDeepStrictEqual(current.gif, message.gif) ||
      current.editedAt?.getTime() !== toDate(message.dumped.editedAt)?.getTime();
    const isEditedHere = current.revision > 1;
    if (!isChanged || isEditedHere) {
      report.messages.unchanged++;
      continue;
    }

    await tx
      .update(chatMessages)
      .set({
        contentMarkdown: message.markdown,
        attachments: message.attachments,
        gif: message.gif,
        editedAt: toDate(message.dumped.editedAt),
      })
      .where(eq(chatMessages.id, message.id));
    report.messages.updated++;
  }
}

function addUploads(tx: Tx, workspaceId: string, restored: RestoredMessage[]): Promise<number> {
  const expiresAt = new Date(Date.now() + ATTACHED_LIFETIME_MS);
  const rows = restored.flatMap((message) =>
    message.attachments.map((attachment) => ({
      id: attachment.id,
      workspaceId,
      channelId: message.channelId,
      ownerMemberId: message.authorMemberId,
      name: attachment.name,
      size: attachment.size,
      objectKey: attachmentObjectKey(workspaceId, attachment.id),
      multipartId: IMPORTED_MULTIPART_ID,
      state: 'attached' as const,
      metadata: attachment,
      createdAt: new Date(message.dumped.createdAt),
      expiresAt,
    })),
  );

  return insertAll(rows, (batch) =>
    tx.insert(chatUploads).values(batch).onConflictDoNothing().returning({ id: chatUploads.id }),
  );
}

function addReactions(
  tx: Tx,
  workspaceId: string,
  restored: RestoredMessage[],
  ids: RestoredIds,
): Promise<number> {
  const rows = restored.flatMap((message) =>
    message.dumped.reactions.flatMap((reaction) =>
      reaction.personIds.map((personId) => ({
        workspaceId,
        channelId: message.channelId,
        messageId: message.id,
        emoji: reaction.emoji,
        memberId: ids.members.get(personId)!,
        createdAt: new Date(message.dumped.createdAt),
      })),
    ),
  );

  return insertAll(rows, (batch) =>
    tx
      .insert(messageReactions)
      .values(batch)
      .onConflictDoNothing()
      .returning({ messageId: messageReactions.messageId }),
  );
}

function addMentions(tx: Tx, workspaceId: string, restored: RestoredMessage[]): Promise<number> {
  const rows = restored.flatMap((message) =>
    message.mentions.memberIds.map((memberId) => ({
      workspaceId,
      channelId: message.channelId,
      messageId: message.id,
      memberId,
      via: 'direct' as const,
    })),
  );

  return insertAll(rows, (batch) =>
    tx
      .insert(messageMentions)
      .values(batch)
      .onConflictDoNothing()
      .returning({ messageId: messageMentions.messageId }),
  );
}

function addPins(
  tx: Tx,
  workspaceId: string,
  restored: RestoredMessage[],
  ids: RestoredIds,
): Promise<number> {
  const rows = restored.flatMap(({ dumped, id, channelId }) =>
    dumped.pin
      ? [
          {
            workspaceId,
            channelId,
            messageId: id,
            pinnedByMemberId: ids.members.get(dumped.pin.byId)!,
            pinnedAt: new Date(dumped.pin.at),
          },
        ]
      : [],
  );

  return insertAll(rows, (batch) =>
    tx
      .insert(messagePins)
      .values(batch)
      .onConflictDoNothing()
      .returning({ messageId: messagePins.messageId }),
  );
}

/**
 * Appends each channel's new messages in Discord's order and brings earlier restored ones up to
 * date while nobody has edited them here. Reactions, mentions, pins and uploads are only added.
 */
export async function restoreHistory(
  tx: Tx,
  workspaceId: string,
  histories: ChannelHistory[],
  ids: RestoredIds,
  files: Map<string, StoredAttachment>,
): Promise<{ report: HistoryReport; appended: AppendedEntries; broadMentions: BroadMention[] }> {
  const restored: RestoredMessage[] = [];
  for (const history of histories) {
    restored.push(...(await toRestored(workspaceId, history, ids, files)));
  }
  // One order across channels: a forward's source is always older than the forward.
  restored.sort((a, b) => (a.discordId < b.discordId ? -1 : 1));

  const existing = await existingMessages(
    tx,
    restored.map((message) => message.id),
  );
  const fresh = restored.filter((message) => !existing.has(message.id));
  const report: HistoryReport = {
    messages: newTally(),
    appendedOutOfOrder: 0,
    uploadsAdded: 0,
    reactionsAdded: 0,
    mentionsAdded: 0,
    pinsAdded: 0,
  };

  const appended = await appendNew(tx, workspaceId, fresh, ids, report);
  await refreshRestored(tx, restored, existing, report);
  report.uploadsAdded = await addUploads(tx, workspaceId, restored);
  report.reactionsAdded = await addReactions(tx, workspaceId, restored, ids);
  report.mentionsAdded = await addMentions(tx, workspaceId, restored);
  report.pinsAdded = await addPins(tx, workspaceId, restored, ids);

  const broadMentions = fresh
    .filter(({ mentions }) => mentions.everyone || mentions.roleIds.length)
    .map(({ id, mentions }) => ({
      messageId: id,
      everyone: mentions.everyone,
      roleIds: mentions.roleIds,
    }));
  return { report, appended, broadMentions };
}

// Reaches whom the app's own @everyone and role pings reach: the channel's active participants,
// through the role for a role, never the author. A direct mention of the same person stays direct.
export async function addBroadMentions(tx: Tx, broadMentions: BroadMention[]): Promise<number> {
  let added = 0;

  const everyone = broadMentions
    .filter((mention) => mention.everyone)
    .map((mention) => mention.messageId);
  for (const batch of inBatches(everyone)) {
    const { rows } = await tx.execute(sql`
      insert into ${messageMentions} (workspace_id, channel_id, message_id, member_id, via)
      select m.workspace_id, m.channel_id, m.id, cm.member_id, 'everyone'
      from ${chatMessages} m
      join ${channelMemberships} cm on cm.channel_id = m.channel_id
      join ${workspaceMembers} w on w.id = cm.member_id and w.status = 'active'
      where m.id in (${sql.join(
        batch.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
        and cm.member_id <> m.author_member_id
      on conflict do nothing
      returning message_id
    `);
    added += rows.length;
  }

  const pings = broadMentions.flatMap(({ messageId, roleIds }) =>
    roleIds.map((roleId) => ({ messageId, roleId })),
  );
  for (const batch of inBatches(pings, 500)) {
    const pinged = sql.join(
      batch.map(({ messageId, roleId }) => sql`(${messageId}::uuid, ${roleId}::uuid)`),
      sql`, `,
    );
    const reached = sql`
      select distinct m.workspace_id, m.channel_id, m.id as message_id, rm.member_id, rm.role_id
      from (values ${pinged}) as pinged (message_id, role_id)
      join ${chatMessages} m on m.id = pinged.message_id
      join ${activeRoleMembers} rm on rm.role_id = pinged.role_id
      join ${channelMemberships} cm on cm.channel_id = m.channel_id and cm.member_id = rm.member_id
      where rm.member_id <> m.author_member_id
    `;
    const { rows } = await tx.execute(sql`
      insert into ${messageMentions} (workspace_id, channel_id, message_id, member_id, via)
      select distinct workspace_id, channel_id, message_id, member_id, 'role' from (${reached}) reached
      on conflict do nothing
      returning message_id
    `);
    added += rows.length;
    await tx.execute(sql`
      insert into ${messageRoleMentions} (message_id, member_id, role_id)
      select message_id, member_id, role_id from (${reached}) reached
      on conflict do nothing
    `);
  }
  return added;
}

// History from Discord was read there: whoever had read up to it here is not shown it as unread.
export async function markHistoryRead(tx: Tx, appended: AppendedEntries): Promise<void> {
  for (const [channelId, { firstSeq, lastSeq }] of appended) {
    await tx
      .update(channelMemberships)
      .set({ lastReadEntrySeq: lastSeq })
      .where(
        and(
          eq(channelMemberships.channelId, channelId),
          gte(channelMemberships.lastReadEntrySeq, firstSeq - 1n),
        ),
      );
  }
}
