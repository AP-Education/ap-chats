import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * A Discord server in our model's shape: what dump-discord.ts writes and restore-discord.ts reads.
 * Every id in it is Discord's own; the restore turns each into the row it lands on.
 */
export interface GuildDump {
  guild: { id: string; name: string };
  /** Only the bot reads who may see what; exports alone leave every channel's grants unknown. */
  structure: 'discord-api' | 'exports';
  roles: DumpedRole[];
  categories: DumpedCategory[];
  channels: DumpedChannel[];
  people: DumpedPerson[];
}

export type Capability = 'view' | 'post' | 'manage';

export type DumpedGrant =
  | { capability: Capability; principal: 'everyone' }
  | { capability: Capability; principal: 'role'; roleId: string }
  | { capability: Capability; principal: 'member'; personId: string };

export interface DumpedRole {
  id: string;
  name: string;
  color: string | null;
  /** Top first, as our roles are ordered. */
  position: number;
  isHoisted: boolean;
}

export interface DumpedCategory {
  id: string;
  name: string;
  position: number;
}

export interface DumpedChannel {
  id: string;
  name: string;
  categoryId: string | null;
  /** Null when unknown: the channel then waits for a manager to list who sees it. */
  grants: DumpedGrant[] | null;
  /** Its history file, when the channel was exported. */
  history: string | null;
}

export interface DumpedPerson {
  id: string;
  displayName: string;
  username: string;
  isBot: boolean;
  /** A file in the dump. */
  avatar: string | null;
  roleIds: string[];
}

export interface ChannelHistory {
  channelId: string;
  /** Oldest first. */
  messages: DumpedMessage[];
}

export interface DumpedMessage {
  id: string;
  authorId: string;
  createdAt: string;
  editedAt: string | null;
  /** Our markdown, with references naming Discord ids, `:member[discord:<id>]`, until restored. */
  markdown: string;
  attachments: DumpedAttachment[];
  replyToId: string | null;
  forwardedFrom: { messageId: string; authorId: string } | null;
  reactions: DumpedReaction[];
  pin: { byId: string; at: string } | null;
  gif: DumpedGif | null;
}

/** A GIF as our messages keep it: its link in the text and the media its service serves. */
export interface DumpedGif {
  provider: 'klipy' | 'giphy' | 'tenor';
  link: string;
  title: string;
  media: { url: string; width: number; height: number };
}

export interface DumpedAttachment {
  id: string;
  name: string;
  size: number;
  /** A file in the dump. */
  file: string;
}

export interface DumpedReaction {
  emoji: string;
  personIds: string[];
}

export const GUILD_FILE = 'guild.json';
export const DISCORD_REFERENCE = /:(member|role|channel)\[discord:(\d+)\]/g;

export const historyFile = (channelId: string) => path.join('history', `${channelId}.json`);

export function discordReference(kind: 'member' | 'role' | 'channel', id: string): string {
  return `:${kind}[discord:${id}]`;
}

export async function writeDumpFile(dumpDir: string, file: string, value: unknown): Promise<void> {
  const target = path.join(dumpDir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readDumpFile<T>(dumpDir: string, file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(dumpDir, file), 'utf8')) as T;
}

export const bySnowflake = (a: { id: string }, b: { id: string }) =>
  BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0;

const NAME_MAX_LENGTH = 80;

// Our names are unique per workspace; the oldest holder keeps a name, so suffixes stay put between runs.
export function uniqueNames<T extends { id: string; name: string }>(
  items: T[],
): Map<string, string> {
  const taken = new Set<string>();
  const names = new Map<string, string>();

  for (const item of [...items].sort(bySnowflake)) {
    const base = item.name.trim().slice(0, NAME_MAX_LENGTH);
    let name = base;
    for (let n = 2; taken.has(name.toLowerCase()); n++) {
      const suffix = `-${n}`;
      name = `${base.slice(0, NAME_MAX_LENGTH - suffix.length)}${suffix}`;
    }
    taken.add(name.toLowerCase());
    names.set(item.id, name);
  }
  return names;
}
