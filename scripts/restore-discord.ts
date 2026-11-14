/**
 * Restores a dump-discord.ts dump into a workspace: roles, categories, channels and who may see
 * them, the people, and each channel's history with its files, reactions, mentions and pins. Safe
 * to rerun: every row is found by the Discord object it came from, and nothing is deleted.
 *
 *   node --env-file-if-exists=.env --import tsx scripts/restore-discord.ts \
 *     --dump <dump folder> --workspace <workspace uuid> [--dry-run]
 *
 * Files go to the app's storage first (DIGITAL_OCEAN_SPACES_*), then every row in one transaction.
 * People are matched to AP accounts through the links link-discord-users.ts writes, and a linked
 * person joins the workspace as themselves before they ever sign in. Anyone else becomes an
 * inactive placeholder, oidc id "discord:<id>", whose history a later run hands over once linked.
 */
import { parseArgs } from 'node:util';

import type { ObjectStorage } from '@ap-education/storage';
import { createS3Storage, spacesOptions } from '@ap-education/storage/s3';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { AppConfig } from '../src/globals/config/config.schema';
import { AppConfigService } from '../src/globals/config/config.service';
import {
  type ChannelHistory,
  GUILD_FILE,
  type GuildDump,
  readDumpFile,
} from './discord/dump-format';
import { memberLinksPath, readMemberLinks } from './discord/member-links';
import { storeAttachments, storeAvatars } from './discord/restore-files';
import { addBroadMentions, markHistoryRead, restoreHistory } from './discord/restore-history';
import { findOwnerMemberId, resolvePeople } from './discord/restore-people';
import {
  addListedParticipants,
  insertGrants,
  insertRoleHolders,
  type RestoredIds,
  upsertCategories,
  upsertChannels,
  upsertRoles,
} from './discord/restore-structure';

class DryRunRollback extends Error {}

function openStorage(): ObjectStorage {
  const config = new AppConfigService(new ConfigService<AppConfig, true>());
  return createS3Storage(
    spacesOptions({
      bucket: config.get('DIGITAL_OCEAN_SPACES_BUCKET'),
      endpoint: config.get('DIGITAL_OCEAN_SPACES_ENDPOINT'),
      accessKey: config.get('DIGITAL_OCEAN_SPACES_ACCESS_KEY'),
      secretKey: config.get('DIGITAL_OCEAN_SPACES_SECRET_KEY'),
    }),
  );
}

async function main(): Promise<void> {
  const { values: args } = parseArgs({
    options: {
      dump: { type: 'string' },
      workspace: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !args.dump || !args.workspace) {
    throw new Error('DATABASE_URL, --dump and --workspace are required');
  }
  const dumpDir = args.dump;
  const workspaceId = args.workspace;
  const isDryRun = args['dry-run'];

  const dump = await readDumpFile<GuildDump>(dumpDir, GUILD_FILE);
  const histories: ChannelHistory[] = [];
  for (const channel of dump.channels) {
    if (channel.history)
      histories.push(await readDumpFile<ChannelHistory>(dumpDir, channel.history));
  }

  const linksPath = memberLinksPath(dump.guild.id);
  const memberLinks = await readMemberLinks(linksPath);
  if (!memberLinks) {
    console.warn(
      `No member links at ${linksPath}; every Discord member becomes a placeholder. ` +
        'Run scripts/link-discord-users.ts first to link them to existing users.',
    );
  }
  if (dump.structure === 'exports') {
    console.warn(
      'The dump has no access lists; channels wait for a manager to list who sees them.',
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  const storage = isDryRun ? null : openStorage();
  const report: Record<string, unknown> = {};

  try {
    // Storage cannot roll back; its keys are fixed per file, so a failed run's objects are reused.
    const files = await storeAttachments(db, storage, workspaceId, dumpDir, histories);
    const avatarUrls = await storeAvatars(storage, dumpDir, dump.people);

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${workspaceId}, 0))`);

      const ownerMemberId = await findOwnerMemberId(tx, workspaceId);
      const people = await resolvePeople(
        tx,
        workspaceId,
        dump.people,
        memberLinks?.links ?? {},
        avatarUrls,
      );
      const ids: RestoredIds = {
        roles: new Map(),
        categories: new Map(),
        channels: new Map(),
        members: people.members,
      };

      report.linkedMembersAdded = people.linkedMembersAdded;
      report.placeholdersAdded = people.placeholdersAdded;
      report.placeholdersClaimed = people.claimed;
      report.roles = await upsertRoles(tx, workspaceId, dump, ids.roles);
      report.categories = await upsertCategories(tx, workspaceId, dump, ids.categories);
      report.channels = await upsertChannels(tx, workspaceId, ownerMemberId, dump, ids);
      report.grantsAdded = await insertGrants(tx, workspaceId, dump, ids);
      report.roleHoldersAdded = await insertRoleHolders(tx, workspaceId, dump, ids);

      const history = await restoreHistory(tx, workspaceId, histories, ids, files);
      report.history = history.report;
      report.participantsAdded = await addListedParticipants(tx, workspaceId);
      report.broadMentionsAdded = await addBroadMentions(tx, history.broadMentions);
      await markHistoryRead(tx, history.appended);

      if (isDryRun) throw new DryRunRollback();
    });
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
    report.dryRun = 'rolled back';
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
