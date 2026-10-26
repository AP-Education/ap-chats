/**
 * Writes a Discord server in our model's shape: guild.json with its roles, categories, channels,
 * access and people, a history file per exported channel, and the files they show. Safe to rerun;
 * the same input gives the same dump, and a file already in it is not copied again.
 *
 *   node --env-file-if-exists=.env --import tsx scripts/dump-discord.ts \
 *     --exports <DiscordChatExporter JSON folder or file> [--exports …] --out <dump folder> \
 *     [--leave-out <channel id> …]
 *
 * History comes from DiscordChatExporter's JSON exports, made with --media. With DISCORD_TOKEN, a
 * read-only bot's, the structure comes from Discord itself, who may see each channel included;
 * exports alone only show the roles people carried and leave every channel's access to the app.
 * A channel left out, such as a bot's alert feed, is not created and keeps none of its history.
 */
import { parseArgs } from 'node:util';

import { apiStructure } from './discord/api-structure';
import { fetchGuild, refreshFileLink } from './discord/discord-api';
import { DumpFiles } from './discord/dump-files';
import {
  bySnowflake,
  discordReference,
  GUILD_FILE,
  type GuildDump,
  historyFile,
  uniqueNames,
  writeDumpFile,
} from './discord/dump-format';
import {
  type ExportedChannel,
  exportedFiles,
  exportedHistory,
  exportedPeople,
  exportedStructure,
  type HistoryTally,
  readExports,
  settleReferences,
} from './discord/exported-history';

type Structure = Omit<GuildDump, 'guild' | 'structure'>;

// Channels exported but gone from the server, and people who left it, keep their history.
function joinStructures(fromApi: Structure, fromExports: Structure): Structure {
  const exported = new Set(fromExports.channels.map((channel) => channel.id));
  const serverChannels = new Set(fromApi.channels.map((channel) => channel.id));
  const channels = [
    ...fromApi.channels.map((channel) => ({
      ...channel,
      history: exported.has(channel.id) ? historyFile(channel.id) : null,
    })),
    ...fromExports.channels.filter((channel) => !serverChannels.has(channel.id)),
  ].sort(bySnowflake);
  const channelNames = uniqueNames(channels);

  const exportedPeopleById = new Map(fromExports.people.map((person) => [person.id, person]));
  const members = new Set(fromApi.people.map((person) => person.id));
  const people = [
    ...fromApi.people.map((person) => ({
      ...person,
      avatar: exportedPeopleById.get(person.id)?.avatar ?? null,
    })),
    ...fromExports.people.filter((person) => !members.has(person.id)),
  ].sort(bySnowflake);

  return {
    roles: fromApi.roles,
    categories: fromApi.categories,
    channels: channels.map((channel) => ({ ...channel, name: channelNames.get(channel.id)! })),
    people,
  };
}

async function main(): Promise<void> {
  const { values: args } = parseArgs({
    options: {
      exports: { type: 'string', multiple: true },
      out: { type: 'string' },
      'leave-out': { type: 'string', multiple: true },
    },
  });
  if (!args.exports?.length || !args.out) throw new Error('--exports and --out are required');

  const leftOut = new Set(args['leave-out']);
  const exports: ExportedChannel[] = (await readExports(args.exports)).filter(
    ({ channel }) => !leftOut.has(channel.id),
  );
  const guilds = new Map(exports.map(({ guild }) => [guild.id, guild]));
  if (guilds.size !== 1) throw new Error(`Expected one server's exports, found ${guilds.size}`);
  const [guild] = [...guilds.values()];

  const token = process.env.DISCORD_TOKEN;
  const files = await DumpFiles.open(
    args.out,
    token ? (link) => refreshFileLink(token, link) : null,
  );
  await files.prefetch(exportedFiles(exports));
  const fromExports = {
    ...exportedStructure(exports),
    people: await exportedPeople(exports, files),
  };
  const joined = token
    ? joinStructures(apiStructure(await fetchGuild(token, guild!.id)), fromExports)
    : fromExports;
  const channels = joined.channels.filter((channel) => !leftOut.has(channel.id));
  // A category left with no channel to hold has nothing to bring over.
  const holding = new Set(channels.map((channel) => channel.categoryId));
  const structure = {
    ...joined,
    channels,
    categories: joined.categories.filter((category) => holding.has(category.id)),
  };

  const holders = new Map<string, number>();
  for (const { displayName } of structure.people) {
    holders.set(displayName, (holders.get(displayName) ?? 0) + 1);
  }
  const names = {
    roles: new Map(structure.roles.map((role) => [role.name, discordReference('role', role.id)])),
    channels: new Map(
      structure.channels.map((channel) => [channel.name, discordReference('channel', channel.id)]),
    ),
    people: new Map(
      structure.people
        .filter((person) => holders.get(person.displayName) === 1)
        .map((person) => [person.displayName, discordReference('member', person.id)]),
    ),
  };
  const exportedById = new Map(
    exports.flatMap(({ messages }) => messages.map((message) => [message.id, message])),
  );
  const tally: HistoryTally = {};
  const histories = [];
  for (const channelExport of exports) {
    histories.push(await exportedHistory(channelExport, exportedById, names, files, tally));
  }
  settleReferences(histories, tally);
  await files.saveIndex();

  const dump: GuildDump = {
    guild: { id: guild!.id, name: guild!.name },
    structure: token ? 'discord-api' : 'exports',
    ...structure,
  };
  await writeDumpFile(args.out, GUILD_FILE, dump);
  for (const history of histories) {
    await writeDumpFile(args.out, historyFile(history.channelId), history);
  }

  const messages = histories.flatMap((history) => history.messages);
  console.log(
    JSON.stringify(
      {
        out: args.out,
        structure: dump.structure,
        roles: dump.roles.length,
        categories: dump.categories.length,
        channels: dump.channels.length,
        channelsWithHistory: histories.length,
        people: dump.people.length,
        messages: messages.length,
        attachments: messages.reduce((sum, message) => sum + message.attachments.length, 0),
        reactions: messages.reduce(
          (sum, message) =>
            sum + message.reactions.reduce((all, reaction) => all + reaction.personIds.length, 0),
          0,
        ),
        leftOut: tally,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
