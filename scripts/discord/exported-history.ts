import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import type { DumpFiles } from './dump-files';
import {
  bySnowflake,
  type ChannelHistory,
  discordReference,
  type DumpedAttachment,
  type DumpedCategory,
  type DumpedChannel,
  type DumpedMessage,
  type DumpedPerson,
  type DumpedReaction,
  type DumpedRole,
  historyFile,
  uniqueNames,
} from './dump-format';
import { embeddedGif, type GifEmbed } from './exported-gifs';

interface ExportedRole {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface ExportedUser {
  id: string;
  name: string;
  nickname: string;
  isBot: boolean;
  avatarUrl: string;
  roles?: ExportedRole[];
}

interface ExportedAttachment {
  id: string;
  url: string;
  fileName: string;
}

interface ExportedSticker {
  id: string;
  name: string;
  format: string;
  sourceUrl: string;
}

interface ExportedEmbed extends GifEmbed {
  description: string;
  fields: { name: string; value: string }[];
  footer?: { text: string };
}

interface ExportedMessage {
  id: string;
  type: string;
  timestamp: string;
  timestampEdited: string | null;
  isPinned: boolean;
  content: string;
  author: ExportedUser;
  attachments: ExportedAttachment[];
  stickers: ExportedSticker[];
  reactions: { emoji: { id: string; name: string }; users: ExportedUser[] }[];
  mentions: ExportedUser[];
  embeds: ExportedEmbed[];
  reference?: { type?: string; messageId: string | null };
  forwardedMessage?: {
    content: string;
    attachments: ExportedAttachment[];
    stickers: ExportedSticker[];
  };
}

/** A channel as DiscordChatExporter writes it in JSON, with its media paths made absolute. */
export interface ExportedChannel {
  guild: { id: string; name: string };
  channel: { id: string; categoryId: string | null; category: string | null; name: string };
  exportedAt: string;
  messages: ExportedMessage[];
}

/** What the history step leaves out or cannot keep, so the dump says what did not make it. */
export type HistoryTally = Record<string, number>;

/** The names a message's text uses, as Discord printed them, each with the reference it becomes. */
export interface ReferenceNames {
  roles: Map<string, string>;
  channels: Map<string, string>;
  /** Names only one person goes by, for a forward's text, whose mentions exports leave out. */
  people: Map<string, string>;
}

const MAX_ATTACHMENTS = 10;
// Exports name the types they know and number the rest: 20 and 23 are a bot's answers to commands.
const KEPT_TYPES = new Set(['Default', 'Reply', '20', '23']);
const IMAGE_STICKER_FORMATS = new Set(['Png', 'Apng', 'Gif']);
// One fully qualified emoji, as our reactions accept them.
const REACTION_EMOJI = new RegExp('^\\p{RGI_Emoji}$', 'v');
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F]/gu;
// Discord shows a lone "+", "2)" or "---" as typed; our markdown would read an empty list item or a rule.
const BARE_LIST_MARKER = /^([ \t]*)([-+*]|\d+[.)])[ \t]*$/gm;
const THEMATIC_BREAK = /^([ \t]*)([-*_])((?:[ \t]*\2){2,}[ \t]*)$/gm;

const isRemote = (url: string) => /^https?:\/\//.test(url);
const toIso = (timestamp: string) => new Date(timestamp).toISOString();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function count(tally: HistoryTally, reason: string, by = 1): void {
  tally[reason] = (tally[reason] ?? 0) + by;
}

// ---------- Reading ----------

async function jsonFilesIn(target: string): Promise<string[]> {
  if (!(await stat(target)).isDirectory()) return [target];

  const entries = await readdir(target, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}

function isChannelExport(value: unknown): value is ExportedChannel {
  const data = value as Partial<ExportedChannel> | null;
  return Boolean(data?.guild?.id && data.channel?.id && Array.isArray(data.messages));
}

function withAbsoluteMedia(message: ExportedMessage, folder: string): ExportedMessage {
  const local = (url: string) => (isRemote(url) ? url : path.resolve(folder, url));
  const user = (person: ExportedUser) => ({ ...person, avatarUrl: local(person.avatarUrl) });
  const files = (attachments: ExportedAttachment[]) =>
    attachments.map((attachment) => ({ ...attachment, url: local(attachment.url) }));
  const stickers = (list: ExportedSticker[]) =>
    list.map((sticker) => ({ ...sticker, sourceUrl: local(sticker.sourceUrl) }));

  return {
    ...message,
    author: user(message.author),
    mentions: message.mentions.map(user),
    reactions: message.reactions.map((reaction) => ({
      ...reaction,
      users: reaction.users.map(user),
    })),
    attachments: files(message.attachments),
    stickers: stickers(message.stickers),
    ...(message.forwardedMessage && {
      forwardedMessage: {
        ...message.forwardedMessage,
        attachments: files(message.forwardedMessage.attachments),
        stickers: stickers(message.forwardedMessage.stickers),
      },
    }),
  };
}

/** Every channel export under the paths; a channel exported twice keeps each message's latest copy. */
export async function readExports(targets: string[]): Promise<ExportedChannel[]> {
  const exports: ExportedChannel[] = [];
  for (const target of targets) {
    for (const file of await jsonFilesIn(path.resolve(target))) {
      const data: unknown = JSON.parse(await readFile(file, 'utf8'));
      if (!isChannelExport(data)) continue;

      const folder = path.dirname(file);
      exports.push({
        ...data,
        messages: data.messages.map((message) => withAbsoluteMedia(message, folder)),
      });
    }
  }

  const byChannel = new Map<string, ExportedChannel>();
  for (const channelExport of exports.sort((a, b) => a.exportedAt.localeCompare(b.exportedAt))) {
    const earlier = byChannel.get(channelExport.channel.id);
    const messages = new Map(earlier?.messages.map((message) => [message.id, message]));
    for (const message of channelExport.messages) messages.set(message.id, message);

    byChannel.set(channelExport.channel.id, {
      ...channelExport,
      messages: [...messages.values()].sort(bySnowflake),
    });
  }
  return [...byChannel.values()].sort((a, b) => bySnowflake(a.channel, b.channel));
}

/** Every file a dump may keep from the exports: attachments, image stickers and avatars. */
export function exportedFiles(exports: ExportedChannel[]): string[] {
  return exports.flatMap(({ messages }) =>
    messages.flatMap((message) => {
      const sources = [message, ...(message.forwardedMessage ? [message.forwardedMessage] : [])];
      return [
        message.author.avatarUrl,
        ...message.mentions.map((person) => person.avatarUrl),
        ...message.reactions.flatMap((reaction) =>
          reaction.users.map((person) => person.avatarUrl),
        ),
        ...sources.flatMap((source) => [
          ...source.attachments.map((attachment) => attachment.url),
          ...source.stickers
            .filter((sticker) => IMAGE_STICKER_FORMATS.has(sticker.format))
            .map((sticker) => sticker.sourceUrl),
        ]),
      ];
    }),
  );
}

// ---------- Structure ----------

/** What exports say about the server: roles people carried, categories and channel names, no access. */
export function exportedStructure(exports: ExportedChannel[]): {
  roles: DumpedRole[];
  categories: DumpedCategory[];
  channels: DumpedChannel[];
} {
  const roles = new Map<string, ExportedRole>();
  const categories = new Map<string, { id: string; name: string }>();
  for (const { channel, messages } of exports) {
    if (channel.categoryId && channel.category) {
      categories.set(channel.categoryId, { id: channel.categoryId, name: channel.category });
    }
    for (const message of messages) {
      for (const person of [message.author, ...message.mentions]) {
        for (const role of person.roles ?? []) roles.set(role.id, role);
      }
    }
  }

  const roleNames = uniqueNames([...roles.values()]);
  const categoryNames = uniqueNames([...categories.values()]);
  const channelNames = uniqueNames(exports.map(({ channel }) => channel));

  return {
    roles: [...roles.values()]
      .sort((a, b) => b.position - a.position || bySnowflake(a, b))
      .map((role, position) => ({
        id: role.id,
        name: roleNames.get(role.id)!,
        color: role.color,
        position,
        isHoisted: false,
      })),
    categories: [...categories.values()].sort(bySnowflake).map((category, position) => ({
      id: category.id,
      name: categoryNames.get(category.id)!,
      position,
    })),
    channels: exports.map(({ channel }) => ({
      id: channel.id,
      name: channelNames.get(channel.id)!,
      categoryId: channel.categoryId,
      grants: null,
      history: historyFile(channel.id),
    })),
  };
}

/** Everyone who wrote, was mentioned or reacted, as they last appeared. */
export async function exportedPeople(
  exports: ExportedChannel[],
  files: DumpFiles,
): Promise<DumpedPerson[]> {
  const messages = exports.flatMap((channelExport) => channelExport.messages).sort(bySnowflake);
  const latest = new Map<string, ExportedUser>();
  const roles = new Map<string, ExportedRole[]>();

  for (const message of messages) {
    const appearances = [
      message.author,
      ...message.mentions,
      ...message.reactions.flatMap((reaction) => reaction.users),
    ];
    for (const person of appearances) {
      latest.set(person.id, person);
      if (person.roles) roles.set(person.id, person.roles);
    }
  }

  const people: DumpedPerson[] = [];
  for (const person of [...latest.values()].sort(bySnowflake)) {
    people.push({
      id: person.id,
      displayName: person.nickname || person.name,
      username: person.name,
      isBot: person.isBot,
      avatar: (await files.keep(person.avatarUrl))?.file ?? null,
      roleIds: (roles.get(person.id) ?? []).map((role) => role.id).sort(),
    });
  }
  return people;
}

// ---------- History ----------

// Longest first, so "@Оля Гераськова" is never taken for "@Оля".
function replaceNames(text: string, sigil: string, names: Map<string, string>): string {
  if (!names.size) return text;

  const alternatives = [...names.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])${sigil}(${alternatives.join('|')})(?![\\p{L}\\p{N}_-])`,
    'gu',
  );
  return text.replace(pattern, (_, name: string) => names.get(name)!);
}

// DiscordChatExporter prints mentions as names; the message's own list says which person each one is.
function referenceMarkdown(
  content: string,
  people: Map<string, string>,
  names: Omit<ReferenceNames, 'people'>,
) {
  const text = content
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARACTERS, '')
    .replace(
      BARE_LIST_MARKER,
      (_, indent: string, marker: string) => `${indent}${marker.slice(0, -1)}\\${marker.slice(-1)}`,
    )
    .replace(THEMATIC_BREAK, '$1\\$2$3');

  const withPeople = replaceNames(text, '@', people);
  const withRoles = replaceNames(withPeople, '@', names.roles);
  const withEveryone = withRoles.replace(
    /(?<![\p{L}\p{N}_])@(?:everyone|here)\b/gu,
    ':mention[everyone]',
  );
  return replaceNames(withEveryone, '#', names.channels).trim();
}

// A closed poll is all exports keep of one: its question and the winning answer.
function pollMarkdown(result: ExportedMessage): string {
  const fields = result.embeds[0]?.fields ?? [];
  const field = (name: string) => fields.find((entry) => entry.name === name)?.value;
  const question = field('poll_question_text') ?? '';
  const winner = field('victor_answer_text');
  const total = field('total_votes') ?? '0';

  return winner
    ? `Опитування «${question}» завершено. Переміг варіант «${winner}», голосів: ${field('victor_answer_votes')} з ${total}.`
    : `Опитування «${question}» завершено, голосів: ${total}.`;
}

// A bot's card with no text beside it, such as an alert, read as text: link previews only repeat a link.
function embedsMarkdown(embeds: ExportedEmbed[]): string {
  return embeds
    .map((embed) => {
      const title = embed.url ? `[${embed.title || embed.url}](${embed.url})` : embed.title;
      return [
        title && `**${title}**`,
        embed.description,
        ...embed.fields.map((field) => `**${field.name}**: ${field.value}`),
        embed.footer?.text,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function quoted(markdown: string): string {
  if (!markdown) return markdown;
  return markdown
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function reactionEmoji(emoji: { id: string; name: string }): string | null {
  if (emoji.id) return null;
  return (
    [emoji.name, `${emoji.name}\uFE0F`].find((candidate) => REACTION_EMOJI.test(candidate)) ?? null
  );
}

function reactionsOf(message: ExportedMessage, tally: HistoryTally): DumpedReaction[] {
  const reactions = new Map<string, Set<string>>();
  for (const reaction of message.reactions) {
    const emoji = reactionEmoji(reaction.emoji);
    if (!emoji) {
      count(tally, reaction.emoji.id ? 'custom emoji reactions' : 'letter emoji reactions');
      continue;
    }
    const people = reactions.get(emoji) ?? new Set();
    for (const person of reaction.users) people.add(person.id);
    reactions.set(emoji, people);
  }

  return [...reactions].map(([emoji, people]) => ({ emoji, personIds: [...people].sort() }));
}

interface KeptFiles {
  attachments: DumpedAttachment[];
  missing: string[];
}

async function filesOf(
  message: ExportedMessage,
  source: Pick<ExportedMessage, 'attachments' | 'stickers'>,
  files: DumpFiles,
  tally: HistoryTally,
): Promise<KeptFiles> {
  const candidates = [
    ...source.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.fileName,
      url: attachment.url,
    })),
    ...source.stickers
      .filter((sticker) => {
        const isImage = IMAGE_STICKER_FORMATS.has(sticker.format);
        if (!isImage) count(tally, `${sticker.format} stickers`);
        return isImage;
      })
      .map((sticker) => ({
        id: `sticker-${message.id}-${sticker.id}`,
        name: `${sticker.name}${path.extname(sticker.sourceUrl)}`,
        url: sticker.sourceUrl,
      })),
  ];

  const kept: KeptFiles = { attachments: [], missing: [] };
  for (const candidate of candidates) {
    if (kept.attachments.length === MAX_ATTACHMENTS) {
      count(tally, 'files over the 10 per message');
      continue;
    }
    const file = await files.keep(candidate.url);
    if (file) kept.attachments.push({ id: candidate.id, name: candidate.name, ...file });
    else kept.missing.push(candidate.name);
  }
  count(tally, 'files Discord no longer serves', kept.missing.length);
  return kept;
}

/** A channel's messages in our shape; system notices are folded in or left out. */
export async function exportedHistory(
  channelExport: ExportedChannel,
  exportedById: Map<string, ExportedMessage>,
  names: ReferenceNames,
  files: DumpFiles,
  tally: HistoryTally,
): Promise<ChannelHistory> {
  const pinNotices = new Map<string, ExportedMessage>();
  const pollResults = new Map<string, ExportedMessage>();
  for (const message of channelExport.messages) {
    const target = message.reference?.messageId;
    if (message.type === 'ChannelPinnedMessage' && target) pinNotices.set(target, message);
    if (message.type === 'PollResult' && target) pollResults.set(target, message);
  }

  const messages: DumpedMessage[] = [];
  for (const message of channelExport.messages) {
    if (!KEPT_TYPES.has(message.type)) {
      count(tally, `${/^\d+$/.test(message.type) ? `type ${message.type}` : message.type} notices`);
      continue;
    }

    const forward = message.reference?.type === 'Forward' ? message.forwardedMessage : undefined;
    const source = forward ?? message;
    const forwardSource = forward && exportedById.get(message.reference?.messageId ?? '');
    const pollResult = pollResults.get(message.id);

    const mentioned = forward
      ? names.people
      : new Map(
          message.mentions.map((person) => [
            person.nickname,
            discordReference('member', person.id),
          ]),
        );
    const content = source.content || (forward ? '' : embedsMarkdown(message.embeds));
    const referenced = pollResult
      ? pollMarkdown(pollResult)
      : referenceMarkdown(content, mentioned, names);
    const linked = forward || pollResult ? null : embeddedGif(source.content, message.embeds);
    const text = linked ? referenced.replaceAll(linked.typed, linked.gif.link) : referenced;
    const { attachments, missing } = await filesOf(message, source, files, tally);
    const notes = missing.map((name) => `Файл «${name}» не вдалося забрати з Discord.`);
    const body = [text, ...notes].filter(Boolean).join('\n\n');
    const isLostForward = forward !== undefined && !forwardSource;
    if (isLostForward) count(tally, 'forwards from outside the export');
    const markdown = isLostForward ? quoted(body) : body;
    if (!markdown && !attachments.length) {
      count(tally, 'empty messages');
      continue;
    }

    const pinNotice = pinNotices.get(message.id);
    messages.push({
      id: message.id,
      authorId: message.author.id,
      createdAt: toIso(message.timestamp),
      editedAt: message.timestampEdited && toIso(message.timestampEdited),
      markdown,
      attachments,
      replyToId: message.type === 'Reply' ? (message.reference?.messageId ?? null) : null,
      forwardedFrom: forwardSource
        ? { messageId: forwardSource.id, authorId: forwardSource.author.id }
        : null,
      reactions: reactionsOf(message, tally),
      gif: linked?.gif ?? null,
      pin: message.isPinned
        ? {
            byId: pinNotice?.author.id ?? message.author.id,
            at: toIso(pinNotice?.timestamp ?? message.timestamp),
          }
        : null,
    });
  }

  return { channelId: channelExport.channel.id, messages };
}

/**
 * Points replies and forwards only at messages the dump keeps, so the restore never meets a
 * reference it cannot land: a reply to a lost message stands alone, a lost forward reads as a quote.
 */
export function settleReferences(histories: ChannelHistory[], tally: HistoryTally): void {
  const kept = new Map(
    histories.flatMap((history) =>
      history.messages.map((message) => [message.id, history.channelId] as const),
    ),
  );

  for (const history of histories) {
    for (const message of history.messages) {
      if (message.replyToId && kept.get(message.replyToId) !== history.channelId) {
        message.replyToId = null;
        count(tally, 'replies to messages not kept');
      }
      if (message.forwardedFrom && !kept.has(message.forwardedFrom.messageId)) {
        message.forwardedFrom = null;
        message.markdown = quoted(message.markdown);
        count(tally, 'forwards of messages not kept');
      }
    }
  }
}
