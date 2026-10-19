import type { TFunction } from 'i18next';

// References a message carries inline, as remark text directives; the server reads the same
// grammar in src/components/social/messages/content/message-markdown.ts.

export type MentionToken =
  | { kind: 'member'; id: string }
  | { kind: 'role'; id: string }
  | { kind: 'channel'; id: string }
  | { kind: 'everyone' };

type ReferenceKind = Exclude<MentionToken['kind'], 'everyone'>;

// Every kind of reference by id, with how it reads: a new kind is added here and rendered once.
const references: Record<ReferenceKind, { sigil: '@' | '#' }> = {
  member: { sigil: '@' },
  role: { sigil: '@' },
  channel: { sigil: '#' },
};

export const EVERYONE_TOKEN = ':mention[everyone]';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const uuidPattern = new RegExp(`^${UUID}$`);
const tokenPattern = new RegExp(
  `:(${Object.keys(references).join('|')})\\[(${UUID})\\]|:mention\\[everyone\\]`,
  'g',
);

function isReferenceKind(name: unknown): name is ReferenceKind {
  return typeof name === 'string' && Object.hasOwn(references, name);
}

export function writeToken(token: MentionToken): string {
  return token.kind === 'everyone' ? EVERYONE_TOKEN : `:${token.kind}[${token.id}]`;
}

/** The reference a parsed text directive stands for, or null when it is not one. */
export function readToken(name: string | undefined, label: string): MentionToken | null {
  if (name === 'mention' && label === 'everyone') return { kind: 'everyone' };
  if (isReferenceKind(name) && uuidPattern.test(label)) return { kind: name, id: label };
  return null;
}

/** How a reference reads as text: by its name where known, otherwise by what it is. */
export function tokenText(token: MentionToken, t: TFunction<'mentions'>, name?: string): string {
  if (token.kind === 'everyone') return '@everyone';
  const { sigil } = references[token.kind];
  return `${sigil}${name ?? t(($) => $.unnamed[token.kind])}`;
}

/** The attributes a rendered reference carries, read back by `tokenFromAttributes`. */
export function tokenAttributes(token: MentionToken): Record<string, string> {
  return token.kind === 'everyone'
    ? { 'data-mention': token.kind }
    : { 'data-mention': token.kind, 'data-mention-id': token.id };
}

export function tokenFromAttributes(
  attributes: Record<string, unknown> | undefined,
): MentionToken | null {
  const kind = attributes?.['data-mention'];
  const id = attributes?.['data-mention-id'];
  if (kind === 'everyone') return { kind };
  if (isReferenceKind(kind) && typeof id === 'string') return { kind, id };
  return null;
}

/** The markdown as plain text runs with the references between them, in order. */
export function splitTokens(markdown: string): (string | MentionToken)[] {
  const parts: (string | MentionToken)[] = [];
  let start = 0;

  for (const match of markdown.matchAll(tokenPattern)) {
    const [written, kind, id] = match;
    const token: MentionToken = isReferenceKind(kind) ? { kind, id: id! } : { kind: 'everyone' };
    parts.push(markdown.slice(start, match.index), token);
    start = match.index + written.length;
  }
  parts.push(markdown.slice(start));
  return parts;
}

/** One line of the markdown with its references read as words, without resolving names. */
export function previewText(markdown: string, t: TFunction<'mentions'>): string {
  return splitTokens(markdown)
    .map((part) => (typeof part === 'string' ? part : tokenText(part, t)))
    .join('')
    .replace(/\s+/gu, ' ');
}
